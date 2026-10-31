# FastAPI endpoints for the Next.js front end (owner: Iman)
# Run from the repo's main folder: uvicorn backend.app:app --reload --port 8000
from typing import Literal

import psycopg
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from ai.ai import make_game_plan, sample_game_plan
from backend import rules

app = FastAPI()


@app.exception_handler(psycopg.Error)
def database_error(request, error):
    return JSONResponse(status_code=503, content={"detail": "Database temporarily unavailable. Please try again."})


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
    try:
        rules.set_outcome(o.id, o.stage)
    except psycopg.errors.ForeignKeyViolation:
        raise HTTPException(status_code=404, detail="Profile not found") from None
    return {"ok": True}


@app.get("/api/dashboard")
def dashboard():
    return rules.dashboard()
