import anthropic
import json
import os
from typing import Optional

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """You are an email classifier for a job application tracker.
Given an email's sender, subject, and body snippet, decide whether it is an update about a job application the recipient PERSONALLY SUBMITTED, and extract the details.

Respond with ONLY a valid JSON object — no explanation, no markdown. Use this schema:
{
  "is_job_related": boolean,
  "company": string or null,
  "role": string or null,
  "event_type": "applied" | "oa" | "interview" | "offer" | "rejected" | "other"
}

is_job_related is true ONLY for emails about the recipient's own application to a specific role: application received/submitted confirmations, assessment invitations, interview scheduling, offers, and rejections.

is_job_related MUST be false for anything that is not about an application the recipient already submitted, including:
- Job alerts and job recommendations ("X is hiring", "jobs for you", "apply now", "N new jobs", "companies need your profile"), e.g. from LinkedIn, Indeed, Glassdoor, ZipRecruiter, or company job-alert systems (senders like jobalerts-noreply@linkedin.com or *jobs-noreply*)
- Recruiter cold outreach or staffing-agency pitches about new opportunities
- Talent community / careers newsletters and "stay connected" emails
- Careers-site account notifications (account created, password reset, profile reminders)
- Promotions, event invitations, or anything else

A subject that merely names a role and company (e.g. "Software Engineer at Figma") is a job ALERT, not an application update — false. Application updates address the recipient about an application ("Thank you for applying", "your application", "your interview", "your assessment").

event_type rules:
- "applied": confirmation that an application was submitted
- "oa": online assessment / coding challenge invitation
- "interview": interview scheduled or invitation
- "offer": job offer extended
- "rejected": application declined or position filled
- "other": a genuine update about the recipient's own application that doesn't fit above

If is_job_related is false, set company, role, and event_type to null."""


def classify_email(sender: str, subject: str, snippet: str) -> Optional[dict]:
    prompt = f"Sender: {sender}\nSubject: {subject}\nBody snippet: {snippet[:500]}"

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=256,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )

    try:
        text = message.content[0].text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text.strip())
    except (json.JSONDecodeError, IndexError, KeyError, AttributeError):
        return None
