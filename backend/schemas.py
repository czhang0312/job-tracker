from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional


class StatusEventOut(BaseModel):
    id: int
    status: str
    detected_at: datetime
    email_subject: Optional[str]
    email_snippet: Optional[str]

    model_config = {"from_attributes": True}


class JobApplicationCreate(BaseModel):
    company: str
    role: str
    status: str = "applied"
    applied_date: Optional[datetime] = None
    notes: Optional[str] = None
    job_url: Optional[str] = None


class JobApplicationUpdate(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    applied_date: Optional[datetime] = None
    notes: Optional[str] = None
    job_url: Optional[str] = None


class JobApplicationOut(BaseModel):
    id: int
    company: str
    role: str
    status: str
    applied_date: Optional[datetime]
    updated_at: datetime
    notes: Optional[str]
    job_url: Optional[str]
    events: list[StatusEventOut] = []

    model_config = {"from_attributes": True}


class SyncRequest(BaseModel):
    lookback_days: Optional[int] = 30
    after_date: Optional[date] = None  # takes precedence over lookback_days


class SyncResult(BaseModel):
    emails_scanned: int
    new_applications: int
    updated_applications: int


class DashboardStats(BaseModel):
    total: int
    applied: int
    oa: int
    interview: int
    offer: int
    rejected: int
