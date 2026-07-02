from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from dotenv import load_dotenv
from pathlib import Path
import json
import os

load_dotenv()

_REQUIRED_ENV = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI", "ANTHROPIC_API_KEY", "SECRET_KEY"]
_missing = [k for k in _REQUIRED_ENV if not os.getenv(k)]
if _missing:
    raise SystemExit(
        f"Missing required environment variables: {', '.join(_missing)} — copy .env.example to .env and fill them in."
    )

from database import engine, get_db, Base, SessionLocal
from models import User, JobApplication, StatusEvent
from schemas import (
    JobApplicationCreate,
    JobApplicationUpdate,
    JobApplicationOut,
    SyncRequest,
    SyncResult,
    DashboardStats,
)
from auth import get_oauth_flow, create_access_token, get_current_user, get_gmail_credentials
from gmail import sync_gmail, sync_gmail_stream
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

def _sync_after_date(payload: SyncRequest | None) -> date:
    payload = payload or SyncRequest()
    return payload.after_date or date.today() - timedelta(days=payload.lookback_days or 30)


@app.post("/api/sync", response_model=SyncResult)
def trigger_sync(
    payload: SyncRequest | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not user.access_token:
        raise HTTPException(status_code=400, detail="No Gmail credentials. Please re-authenticate.")
    return sync_gmail(user, db, after=_sync_after_date(payload))


@app.post("/api/sync/stream")
def trigger_sync_stream(
    payload: SyncRequest | None = None,
    user: User = Depends(get_current_user),
):
    if not user.access_token:
        raise HTTPException(status_code=400, detail="No Gmail credentials. Please re-authenticate.")
    after = _sync_after_date(payload)

    def event_stream():
        # own session: Depends(get_db) closes before StreamingResponse finishes
        db = SessionLocal()
        try:
            u = db.merge(user)
            for event in sync_gmail_stream(u, db, after=after):
                yield json.dumps(event) + "\n"
        finally:
            db.close()

    return StreamingResponse(
        event_stream(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


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


# ── Static frontend (Docker image only) ──────────────────────────────────────
# In the container the built SPA is copied to backend/static/; in dev the dir
# doesn't exist and the Vite dev server handles the frontend instead.

STATIC_DIR = Path(os.getenv("STATIC_DIR", Path(__file__).parent / "static"))

if STATIC_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    # registered last, so /api/* and /auth/* routes above always win
    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str):
        candidate = STATIC_DIR / full_path
        if full_path and candidate.is_file() and candidate.resolve().is_relative_to(STATIC_DIR.resolve()):
            return FileResponse(candidate)
        return FileResponse(STATIC_DIR / "index.html")
