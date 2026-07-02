# Job Tracker

Track your job applications automatically. Job Tracker connects to your Gmail (read-only), uses Claude to classify application-related emails — confirmations, online assessments, interviews, offers, rejections — and keeps a live pipeline dashboard of every application you've submitted. You can also add and edit applications manually.

Everything runs on your own machine with your own credentials. Your email never touches anyone else's server except Google's and Anthropic's APIs.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (Desktop on Mac/Windows, Engine + compose plugin on Linux)
- A Google account (the Gmail you apply to jobs with)
- An [Anthropic API key](https://console.anthropic.com/) with a small amount of credit — classification uses Claude Haiku and costs pennies per sync

## 1. Google Cloud setup

You need your own (free) Google OAuth credentials so the app can read your Gmail.

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a new project (any name, e.g. "job-tracker").
2. **Enable the Gmail API**: APIs & Services → Library → search "Gmail API" → Enable.
3. **Configure the OAuth consent screen**: APIs & Services → OAuth consent screen (or "Google Auth Platform"):
   - User type: **External**, then fill in the app name and your email for the required fields.
   - Leave the publishing status as **Testing** — do not publish.
4. **Add yourself as a test user**: on the consent screen config (Audience section), add your own Gmail address. Without this, login fails with `access_denied`.
5. **Add scopes** (Data access section): add `openid`, `.../auth/userinfo.email`, and `.../auth/gmail.readonly`. The Gmail scope is "restricted" — that's fine in Testing mode, no verification needed.
6. **Create credentials**: APIs & Services → Credentials → Create credentials → **OAuth client ID** → Application type **Web application**:
   - Authorized redirect URI: exactly `http://localhost:8000/auth/callback`
   - No JavaScript origins needed.
7. Copy the **client ID** and **client secret**.

## 2. Run it

```bash
git clone <this repo> && cd job-tracker
cp .env.example .env
# edit .env: paste your Google client ID/secret, Anthropic key, and a random SECRET_KEY
docker compose up -d --build
```

Open **http://localhost:8000**, sign in with Google, and click **Sync Gmail**. Pick how far back to scan; the panel shows live progress as each email is classified.

Your data lives in `./data/job_tracker.db` — back it up by copying that file, reset by deleting it.

## Things to know

- **"Google hasn't verified this app"** — expected for a personal OAuth app in Testing mode. Click **Advanced → Continue**.
- **You'll be signed out every 7 days.** Google expires refresh tokens for Testing-status apps with restricted scopes. Just click "Sign in with Google" again — your data is unaffected. The only permanent fix is Google's paid app-verification process, which isn't worth it for personal use.
- **Costs**: each previously unseen email costs one Claude Haiku call (~fractions of a cent). A first scan of a busy inbox over 90 days is capped at 200 emails.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `redirect_uri_mismatch` during login | The redirect URI in Google Cloud must match `http://localhost:8000/auth/callback` character-for-character — `http` not `https`, no trailing slash. |
| `access_denied` during login | Add your Gmail address as a test user on the OAuth consent screen. |
| Sync fails with "No Gmail credentials" | Your Google tokens expired (see 7-day note above) — log out and sign in again. |
| Sync errors mentioning Anthropic / 401 | Check `ANTHROPIC_API_KEY` in `.env` and that your account has credit, then `docker compose up -d --build`. |
| App won't start, "Missing required environment variables" | Copy `.env.example` to `.env` and fill in all values. |

## Development (without Docker)

Backend:

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # dev defaults: frontend on :5173, sqlite in backend/
uvicorn main:app --reload
```

Frontend (separate terminal):

```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:5173 — the Vite dev server proxies `/api` and `/auth` to the backend on :8000. For dev, set the Google redirect URI to `http://localhost:8000/auth/callback` (same as Docker) and `FRONTEND_URL=http://localhost:5173` in `backend/.env`.
