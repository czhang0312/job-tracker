# Job Tracker — Setup

## 1. Google Cloud Console

1. Create a project at console.cloud.google.com
2. Enable **Gmail API** and **Google+ API** (for userinfo)
3. Create OAuth 2.0 credentials → Web application
   - Authorized redirect URI: `http://localhost:8000/auth/callback`
4. Copy the client ID and secret

## 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Fill in .env with your keys
# Generate SECRET_KEY: python -c "import secrets; print(secrets.token_hex(32))"

uvicorn main:app --reload
```

## 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:5173 → Sign in with Google → click **Sync Gmail**

## Environment Variables

| Variable | Description |
|---|---|
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | `http://localhost:8000/auth/callback` |
| `ANTHROPIC_API_KEY` | From console.anthropic.com |
| `SECRET_KEY` | Random string for JWT signing |
| `DATABASE_URL` | `sqlite:///./job_tracker.db` (default) |
| `FRONTEND_URL` | `http://localhost:5173` (default) |
