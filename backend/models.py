from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    google_id = Column(String, unique=True, nullable=False)
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_expiry = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    applications = relationship("JobApplication", back_populates="user")


class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    company = Column(String, nullable=False)
    role = Column(String, nullable=False)
    status = Column(String, nullable=False, default="applied")
    applied_date = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    notes = Column(Text, nullable=True)
    job_url = Column(String, nullable=True)

    user = relationship("User", back_populates="applications")
    events = relationship("StatusEvent", back_populates="application", order_by="StatusEvent.detected_at", cascade="all, delete-orphan")


class StatusEvent(Base):
    __tablename__ = "status_events"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("job_applications.id"), nullable=False)
    status = Column(String, nullable=False)
    detected_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    email_subject = Column(String, nullable=True)
    email_snippet = Column(Text, nullable=True)
    gmail_message_id = Column(String, nullable=True, unique=True)

    application = relationship("JobApplication", back_populates="events")


class ProcessedEmail(Base):
    __tablename__ = "processed_emails"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    gmail_message_id = Column(String, nullable=False, unique=True)
    processed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
