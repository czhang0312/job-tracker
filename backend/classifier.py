import anthropic
import json
import os
from typing import Optional

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """You are an email classifier for a job application tracker.
Given an email's sender, subject, and body snippet, extract job application information.

Respond with ONLY a valid JSON object — no explanation, no markdown. Use this schema:
{
  "is_job_related": boolean,
  "company": string or null,
  "role": string or null,
  "event_type": "applied" | "oa" | "interview" | "offer" | "rejected" | "other"
}

event_type rules:
- "applied": confirmation that an application was submitted
- "oa": online assessment / coding challenge invitation
- "interview": interview scheduled or invitation
- "offer": job offer extended
- "rejected": application declined or position filled
- "other": job-related but doesn't fit above categories

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
