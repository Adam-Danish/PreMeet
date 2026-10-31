# PreMeet

The Next.js frontend calls the FastAPI backend. When `DATABASE_URL` is set, the backend reads profiles and event outcomes from Neon and saves contact outcomes there. With it unset or empty, the backend uses the local JSON files in `data/`.

## Run locally

From the repository root (Python 3.10+):

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Copy `.env.example` to `.env` if you don't already have one. Set `GEMINI_API_KEY` for AI matching, `DATABASE_URL` to the Neon pooled connection string, and `DATABASE_URL_UNPOOLED` to the direct connection string for table creation. Keep `.env` private.

Create the tables and import the sample profiles:

```powershell
python -m backend.seed_db
uvicorn backend.app:app --reload --port 8000
```

The import applies `backend/migrations/001_initial.sql` and inserts missing rows from `data/profiles.json`, plus `data/event_outcomes.json` and `data/outcomes.json` when present. It runs in one transaction and preserves existing database rows, so rerunning it won't reset logged outcomes. JSON files are seed inputs in database mode; later file edits need a separate database update.

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. Next.js forwards `/api/` requests to FastAPI on port 8000. Restart the backend after changing `.env`. A configured database error returns HTTP 503; the app does not silently switch storage during an outage.

The outcome log currently represents one demo founder shared by this app instance. Multiple users need separate founder IDs and authentication.

## Tests

```powershell
pip install -r backend/requirements-test.txt
python -m pytest backend/tests -q
```

The default tests use temporary JSON files. To also test PostgreSQL, set `NEON_TEST_DATABASE_URL` to an isolated Neon test branch; the integration tests roll back their writes after each test.
