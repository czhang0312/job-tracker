from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from dotenv import load_dotenv
import os

load_dotenv()

from database import engine, get_db, Base
from models import User, JobApplication, StatusEvent
from schemas import (
    JobApplicationCreate,
    JobApplicationUpdate,
    JobApplicationOut,
    SyncResult,
    DashboardStats,
)
from auth import get_oauth_flow, create_access_token, get_current_user, get_gmail_credentials
from gmail import sync_gmail
import httpx

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Job Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Auth ─────────────────────────────────────────────────────────────────────

@app.get("/auth/google")
def google_login():
    flow = get_oauth_flow()
    auth_url, _ = flow.authorization_url(prompt="consent", access_type="offline")
    return RedirectResponse(auth_url)


@app.get("/auth/callback")
async def google_callback(code: str, db: Session = Depends(get_db)):
    flow = get_oauth_flow()
    flow.fetch_token(code=code)
    creds = flow.credentials

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {creds.token}"},
        )
    user_info = resp.json()

    user = db.query(User).filter(User.google_id == user_info["id"]).first()
    if not user:
        user = User(
            email=user_info["email"],
            google_id=user_info["id"],
        )
        db.add(user)

    user.access_token = creds.token
    user.refresh_token = creds.refresh_token
    user.token_expiry = creds.expiry
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return RedirectResponse(f"{frontend_url}?token={token}")


@app.get("/auth/me")
def get_me(user: User = Depends(get_current_user)):
    return {"id": user.id, "email": user.email}


# ── Gmail Sync ────────────────────────────────────────────────────────────────

@app.post("/api/sync", response_model=SyncResult)
def trigger_sync(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not user.access_token:
        raise HTTPException(status_code=400, detail="No Gmail credentials. Please re-authenticate.")
    result = sync_gmail(user, db)
    return result


# ── Applications ──────────────────────────────────────────────────────────────

@app.get("/api/applications", response_model=list[JobApplicationOut])
def list_applications(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(JobApplication)
        .filter(JobApplication.user_id == user.id)
        .order_by(JobApplication.updated_at.desc())
        .all()
    )


@app.post("/api/applications", response_model=JobApplicationOut, status_code=201)
def create_application(
    payload: JobApplicationCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app = JobApplication(**payload.model_dump(), user_id=user.id)
    db.add(app)
    db.commit()
    db.refresh(app)
    return app


@app.put("/api/applications/{app_id}", response_model=JobApplicationOut)
def update_application(
    app_id: int,
    payload: JobApplicationUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app = db.query(JobApplication).filter(
        JobApplication.id == app_id, JobApplication.user_id == user.id
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(app, field, value)
    db.commit()
    db.refresh(app)
    return app


@app.delete("/api/applications/{app_id}", status_code=204)
def delete_application(
    app_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app = db.query(JobApplication).filter(
        JobApplication.id == app_id, JobApplication.user_id == user.id
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    db.delete(app)
    db.commit()


# ── Stats ─────────────────────────────────────────────────────────────────────

@app.get("/api/stats", response_model=DashboardStats)
def get_stats(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(JobApplication.status, func.count().label("count"))
        .filter(JobApplication.user_id == user.id)
        .group_by(JobApplication.status)
        .all()
    )
    counts = {r.status: r.count for r in rows}
    total = sum(counts.values())
    return DashboardStats(
        total=total,
        applied=counts.get("applied", 0),
        oa=counts.get("oa", 0),
        interview=counts.get("interview", 0),
        offer=counts.get("offer", 0),
        rejected=counts.get("rejected", 0),
    )
