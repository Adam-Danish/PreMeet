# PreMeet

**Arrive with a plan. Leave with proof.**

PreMeet helps startup founders decide who to meet before an event and track what those conversations lead to afterward.

Built for **Hacktoberfest Hack Day Kuala Lumpur 2026**.

- **Problem Statement:** 1 — Turning Startup ASEAN ecosystem connections into measurable outcomes.
- **Category:** A — Best Use of Gemma 4.

## The problem

Startup events bring founders, investors, corporates and ecosystem partners together. Founders have limited time to find the right people, while organisers need a way to understand what happens after the introductions.

PreMeet connects event preparation with outcome tracking: relevant contacts, purposeful conversations, and a record of meetings, pilots and deals.

## What it does

### Before the event: create a game plan

Enter your sector, target countries, the types of people you want to meet, and your business needs.

PreMeet recommends up to five attendees. Each recommendation includes:

- The person's name, organisation, country and role.
- A specific reason to connect.
- A suggested conversation opener.

### After the event: record the result

Record the furthest stage reached for each recommended contact:

**None → Meeting → Pilot → Deal**

Selections are saved to the shared demo event log.

### For organisers: review outcomes

The event dashboard summarises recorded contacts, meetings, pilots and deals.

Stages are cumulative: a deal also counts as reaching the meeting and pilot stages. Dashboard totals reflect recorded outcomes, rather than verified business results.

## How Gemma is used

1. FastAPI scores attendee profiles against the founder's sector, target countries, preferred contact types and business needs.
2. The highest-scoring candidates are passed to Gemma.
3. Gemma selects and ranks up to five contacts, generating a reason and conversation opener for each.
4. The application checks returned IDs against the candidate list, removes duplicates and attaches attendee details.
5. Successful plans are cached locally for repeat requests.

The AI module supports Gemma through the Gemini API and a local Ollama fallback.

## Technology

| Layer | Tools |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | Python, FastAPI, Pydantic |
| AI | Gemma via the Gemini API; optional Ollama fallback |
| Storage | Local JSON files |

The browser sends requests to Next.js at `/api/*`. Next.js forwards them to FastAPI on port `8000`.

## Run locally

### Prerequisites

- Python with `venv` and `pip`.
- Node.js and npm compatible with the project's Next.js version.
- A Gemini API key with access to the configured Gemma model, or Ollama with the configured local model installed.
- Git.

### 1. Clone the repository

```bash
git clone https://github.com/Adam-Danish/PreMeet.git
cd PreMeet
```

### 2. Set up Python

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it on Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Or on macOS/Linux:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
python -m pip install -r requirements.txt
```

### 3. Configure the environment

Copy `.env.example` to `.env` in the repository root.

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Edit `.env`:

```dotenv
GEMINI_API_KEY=your_api_key_here
CLOUD_MODEL=gemma-4-26b-a4b-it
USE_LOCAL=0
```

`CLOUD_MODEL` is configurable. Use a Gemma model available to your Gemini API account.

Keep your actual API key in `.env`; do not commit it.

### 4. Start the backend

From the repository root, with the virtual environment active:

```bash
python -m uvicorn backend.app:app --reload --port 8000
```

Interactive API documentation:

http://localhost:8000/docs

### 5. Start the frontend

Open a second terminal:

```bash
cd PreMeet/frontend
npm install
npm run dev
```

Open http://localhost:3000.

Keep both terminals running.

### Optional: run Gemma locally

With Ollama installed, pull the model configured by the project:

```bash
ollama pull gemma4:e4b
```

Update `.env`:

```dotenv
USE_LOCAL=1
LOCAL_MODEL=gemma4:e4b
```

Ensure Ollama is running, then restart the backend. Local generation speed depends on your hardware.

## Demo walkthrough

The form starts with Aina's sample profile:

| Field | Value |
|---|---|
| Name | Aina |
| Sector | Agriculture |
| Target countries | Indonesia, Thailand |
| People to meet | Corporate, investor |
| Needs | Plantation pilots and seed funding |

1. Open **Game plan**.
2. Click **Make my game plan →**.
3. Review the recommended contacts, reasons and conversation openers.
4. Open **After the event**.
5. Set a contact's outcome to **Meeting**, **Pilot** or **Deal**.
6. Open **Event dashboard** to see the updated totals.

The application runs locally; a hosted deployment is not required to follow this walkthrough.

## API

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/plan` | Generate a founder's game plan |
| GET | `/api/outcomes` | Retrieve saved contact outcomes |
| POST | `/api/outcomes` | Save a contact's outcome |
| GET | `/api/dashboard` | Retrieve totals and breakdowns |
| GET | `/api/events` | Retrieve upcoming and ongoing events |
| GET | `/api/events/{event_id}` | Retrieve an event |
| GET | `/api/event-history` | Retrieve sample attendance history |

## Project structure

```text
PreMeet/
├── ai/
│   └── ai.py                 # Gemma calls, response checks and caching
├── backend/
│   ├── app.py                # FastAPI endpoints
│   ├── rules.py              # Scoring, persistence and dashboard calculations
│   └── tests/                # Backend tests
├── data/                     # Sample profiles and event data
├── frontend/                 # Next.js application
├── .env.example              # Environment configuration template
├── requirements.txt          # Python dependencies
└── LICENSE                   # MIT licence
```

## Prototype scope

- Attendee profiles and demo outcomes are sample data.
- Outcomes are self-reported and saved in a shared local JSON file.
- Authentication, per-user records and independent outcome verification are not implemented.
- The current game plan is held in browser memory and must be generated again after a page reload.
- The Explore events screen currently uses built-in demonstration data.
- `data/outcomes.json` and `data/plan_cache.json` are created at runtime and excluded from Git.

## Troubleshooting

| Issue | What to check |
|---|---|
| The page cannot load recommendations | Confirm FastAPI is running on port `8000`; inspect its terminal output |
| Gemini requests fail | Check the API key, configured model access, connectivity and quota |
| Local generation fails | Confirm Ollama is running and `LOCAL_MODEL` matches an installed model |
| Generation takes time | Allow the request to finish; repeated identical requests use the saved cache |
| The dashboard is empty | Record a contact outcome in **After the event** first |

## Team

| Member | Contribution |
|---|---|
| Adam Danish | Frontend |
| Iman | Backend and outcome calculations |
| Miras | AI integration |
| Najmi | UI/UX, sample data and presentation |

## Licence

Released under the [MIT License](LICENSE).