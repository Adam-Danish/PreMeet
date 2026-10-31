# FastAPI endpoints for the Next.js front end (owner: Iman)
# Run from the repo's main folder: uvicorn backend.app:app --reload --port 8000
from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from ai.ai import make_game_plan, sample_game_plan
from backend import rules

app = FastAPI()


class Founder(BaseModel):
    name: str
    sector: str
    target_countries: list[str]
    wants: list[str]
    needs: str


class Outcome(BaseModel):
    id: str
    stage: Literal["none", "meeting", "pilot", "deal"]


@app.post("/api/plan")
def plan(founder: Founder):
    f = founder.model_dump()
    profiles = {p["id"]: p for p in rules.load_profiles()}
    candidates = rules.prefilter(f, list(profiles.values()))
    entries = make_game_plan(f, candidates)   # sample_game_plan(f, candidates) to test without a key
    return [{**profiles[e["id"]], **e} for e in entries if e["id"] in profiles]


@app.get("/api/outcomes")
def get_outcomes():
    return rules.load_outcomes()


@app.post("/api/outcomes")
def save_outcome(o: Outcome):
    rules.set_outcome(o.id, o.stage)
    return {"ok": True}


@app.get("/api/dashboard")
def dashboard():
    return rules.dashboard()


@app.get("/api/events")
def events():
    return rules.current_events()


@app.get("/api/events/{event_id}")
def event(event_id: str):
    found = rules.get_event(event_id)
    if found is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return found


@app.get("/api/event-history")
def event_history():
    return rules.event_history()
