# Vercel Services deployment

The repository root contains `vercel.json`. Select Root Directory `./` and the
Services preset when importing the GitHub repository.

## Services and routing (pending owner confirmation)

- `frontend`: Next.js in `frontend/`; public at `/`, including `/events` and `/api/*`.
- `app`: FastAPI at `backend.app:app`, rooted at the repository root so imports
  from `ai/` and reads from `data/` still work. This service has no public rewrite.
- The frontend declares a binding to `app` named `BACKEND_URL`.
- Browser requests keep their existing `/api/*` paths. The Next.js route handler
  forwards them to FastAPI using `BACKEND_URL` at runtime. Methods, queries, bodies,
  status codes and JSON contracts are preserved. Responses are not cached.
- The FastAPI documentation at `/docs` is internal in this configuration.

Do not set `BACKEND_URL` yourself or prefix it with `NEXT_PUBLIC_`. Vercel injects
it separately for each deployment. It is not used in builds or middleware.

## Environment variables

Set these for Production and Preview in Vercel:

- `GEMINI_API_KEY`: your actual API key, stored only in environment settings.
- `CLOUD_MODEL`: a model available to that key (see `.env.example`).
- `USE_LOCAL=0`: use the cloud model; Vercel cannot reach your laptop's Ollama.

The existing sample/live modes and all API payloads are unchanged.

## Local testing

From the repository root, use `vercel dev --local` to run services together with
local binding injection. This starts local development only; it does not deploy.
Install Python requirements in `.venv` and run `npm ci` in `frontend/` first.

For the existing two-terminal workflow, run FastAPI from the repository root:

```bat
.venv\Scripts\activate.bat
python -m uvicorn backend.app:app --reload --reload-dir backend --reload-dir ai --port 8000
```

In the other terminal, from `frontend/`:

```bat
npm run dev
```

Without a binding, the route handler uses `http://127.0.0.1:8000/` only in
`NODE_ENV=development`. A production runtime without a binding returns 503.
Both functions allow 180 seconds; existing browser-side timeouts still apply.

## Remaining deployment limitation

`backend/rules.py` currently saves outcomes into `data/outcomes.json`. Vercel's
function filesystem is read-only outside temporary scratch storage. Outcome saves
therefore need a shared database, such as Supabase, before they work on Vercel.
Moving the file to `/tmp` would not provide durable, shared storage. The optional
AI cache also writes locally, but its write failure is already handled.

No database migration is included in this routing change. Read-only screens can
be tested, but a successful deployment does not establish working outcome saves.

## Before deploying

Confirm the service names, public routing and frontend-to-app binding with the
owner. Commit and push the reviewed files, then use Refresh on Vercel's import
screen. Do not deploy an unreviewed working copy.
