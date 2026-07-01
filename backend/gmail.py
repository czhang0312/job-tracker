from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from sqlalchemy.orm import Session
from datetime import datetime, date, timezone
from typing import Iterator
from models import JobApplication, StatusEvent, ProcessedEmail, User
from classifier import classify_email
import base64
import os
import re

STATUS_PRIORITY = ["rejected", "offer", "interview", "oa", "applied", "other"]


def _decode_body(payload: dict) -> str:
    """Extract plain text from a Gmail message payload."""
    if payload.get("mimeType") == "text/plain":
        data = payload.get("body", {}).get("data", "")
        return base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="ignore")

    for part in payload.get("parts", []):
        text = _decode_body(part)
        if text:
            return text
    return ""


def _get_header(headers: list, name: str) -> str:
    for h in headers:
        if h["name"].lower() == name.lower():
            return h["value"]
    return ""


def _find_or_create_application(
    db: Session, user: User, company: str, role: str, event_type: str, email_date: datetime
) -> tuple[JobApplication, bool]:
    """Return (application, is_new). Matches on company+role (case-insensitive)."""
    existing = (
        db.query(JobApplication)
        .filter(
            JobApplication.user_id == user.id,
            JobApplication.company.ilike(company),
            JobApplication.role.ilike(role),
        )
        .first()
    )

    if existing:
        current_priority = STATUS_PRIORITY.index(existing.status) if existing.status in STATUS_PRIORITY else 99
        new_priority = STATUS_PRIORITY.index(event_type) if event_type in STATUS_PRIORITY else 99
        if new_priority < current_priority:
            existing.status = event_type
        return existing, False

    app = JobApplication(
        user_id=user.id,
        company=company,
        role=role,
        status=event_type,
        applied_date=email_date if event_type == "applied" else None,
    )
    db.add(app)
    db.flush()
    return app, True


def _list_messages(service, query: str, max_emails: int) -> list[dict]:
    """Page through messages.list until the query is exhausted or max_emails is hit."""
    messages: list[dict] = []
    page_token = None
    while len(messages) < max_emails:
        results = (
            service.users()
            .messages()
            .list(userId="me", maxResults=min(100, max_emails - len(messages)), q=query, pageToken=page_token)
            .execute()
        )
        messages.extend(results.get("messages", []))
        page_token = results.get("nextPageToken")
        if not page_token:
            break
    return messages[:max_emails]


def sync_gmail_stream(user: User, db: Session, after: date, max_emails: int = 200) -> Iterator[dict]:
    """Scan Gmail for job-related emails, yielding a progress event per message.

    Commits after each processed email so a client disconnect doesn't lose work.
    """
    try:
        creds = Credentials(
            token=user.access_token,
            refresh_token=user.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.getenv("GOOGLE_CLIENT_ID"),
            client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        )

        service = build("gmail", "v1", credentials=creds, cache_discovery=False)

        already_processed = {
            row.gmail_message_id
            for row in db.query(ProcessedEmail.gmail_message_id).filter(ProcessedEmail.user_id == user.id)
        }

        query = f"in:inbox after:{after.strftime('%Y/%m/%d')}"
        messages = _list_messages(service, query, max_emails)
    except Exception as e:
        yield {"type": "error", "message": str(e)}
        return

    total = len(messages)
    yield {"type": "start", "total": total, "after": after.isoformat()}

    emails_scanned = 0
    new_applications = 0
    updated_applications = 0

    for i, msg_ref in enumerate(messages, start=1):
        msg_id = msg_ref["id"]
        event_out = {"type": "email", "index": i, "total": total, "company": None, "role": None, "status": None, "subject": None}

        if msg_id in already_processed:
            yield {**event_out, "result": "skipped"}
            continue

        try:
            msg = service.users().messages().get(userId="me", id=msg_id, format="full").execute()
            headers = msg.get("payload", {}).get("headers", [])
            sender = _get_header(headers, "From")
            subject = _get_header(headers, "Subject")
            snippet = msg.get("snippet", "")
            body = _decode_body(msg.get("payload", {}))
            text = snippet or body[:500]
            event_out["subject"] = subject

            emails_scanned += 1

            classification = classify_email(sender, subject, text)
            if not classification or not classification.get("is_job_related"):
                db.add(ProcessedEmail(user_id=user.id, gmail_message_id=msg_id))
                db.commit()
                yield {**event_out, "result": "not_job_related"}
                continue

            company = classification.get("company") or "Unknown"
            role = classification.get("role") or "Unknown"
            event_type = classification.get("event_type") or "other"

            internal_date_ms = int(msg.get("internalDate", 0))
            email_date = datetime.fromtimestamp(internal_date_ms / 1000, tz=timezone.utc)

            app, is_new = _find_or_create_application(db, user, company, role, event_type, email_date)

            if is_new:
                new_applications += 1
            else:
                updated_applications += 1

            event = StatusEvent(
                application_id=app.id,
                status=event_type,
                detected_at=email_date,
                email_subject=subject,
                email_snippet=snippet[:300] if snippet else None,
                gmail_message_id=msg_id,
            )
            db.add(event)
            db.add(ProcessedEmail(user_id=user.id, gmail_message_id=msg_id))
            db.commit()

            yield {**event_out, "result": "new" if is_new else "updated", "company": company, "role": role, "status": event_type}
        except Exception as e:
            db.rollback()
            yield {**event_out, "result": "error", "error": str(e)}

    # google-auth may have refreshed the access token; persist it so it isn't dropped
    if creds.token and creds.token != user.access_token:
        user.access_token = creds.token
        db.commit()

    yield {
        "type": "done",
        "summary": {
            "emails_scanned": emails_scanned,
            "new_applications": new_applications,
            "updated_applications": updated_applications,
        },
    }


def sync_gmail(user: User, db: Session, after: date, max_emails: int = 200) -> dict:
    """Non-streaming wrapper: drain the generator and return the final summary."""
    for event in sync_gmail_stream(user, db, after, max_emails):
        if event["type"] == "error":
            raise RuntimeError(event["message"])
        if event["type"] == "done":
            return event["summary"]
    raise RuntimeError("Sync ended without a summary")
