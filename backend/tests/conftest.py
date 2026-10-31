import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT))  # same imports as running uvicorn from the main folder

from backend import rules

AINA = {"name": "Aina", "sector": "agriculture",
        "target_countries": ["Indonesia", "Thailand"], "wants": ["corporate", "investor"],
        "needs": "plantation pilots and seed funding"}


def person(pid, name, org, country, kind, sector, looking_for):
    return {"id": pid, "name": name, "org": org, "country": country, "type": kind,
            "sector": sector, "looking_for": looking_for}


# Same mix Najmi's guide asks for: 12 startups, 8 investors, 6 corporates, 4 government,
# with about 6 strong matches for Aina and the rest clearly weaker.
PROFILES = [
    person("p01", "Budi", "Sawit Agro (sample)", "Indonesia", "corporate", "agriculture",
           "farm-tech pilots on plantations"),
    person("p02", "Siti", "Nusantara Palm (sample)", "Indonesia", "corporate", "agriculture",
           "yield monitoring for plantation estates"),
    person("p03", "Somchai", "Siam Rice Group (sample)", "Thailand", "corporate", "agriculture",
           "pilots with agritech suppliers"),
    person("p04", "Dewi", "Tanah Capital (sample)", "Indonesia", "investor", "agriculture",
           "seed rounds in agritech"),
    person("p05", "Niran", "Mekong Ventures (sample)", "Thailand", "investor", "agriculture",
           "seed funding for food systems"),
    person("p06", "Rina", "AgriNext Fund (sample)", "Indonesia", "investor", "agriculture",
           "early-stage climate farming teams"),
    person("p07", "Linh", "Delta Foods (sample)", "Vietnam", "corporate", "agriculture",
           "cold chain partners"),
    person("p08", "Marco", "Luzon Agri (sample)", "Philippines", "corporate", "agriculture",
           "smallholder financing tools"),
    person("p09", "Kai", "Merlion Ventures (sample)", "Singapore", "investor", "fintech",
           "series A payments companies"),
    person("p10", "Priya", "Straits Capital (sample)", "Singapore", "investor", "healthtech",
           "digital health founders"),
    person("p11", "Tuan", "Saigon Angels (sample)", "Vietnam", "investor", "logistics",
           "last-mile delivery bets"),
    person("p12", "Hafiz", "KL Growth Partners (sample)", "Malaysia", "investor", "fintech",
           "expand brand reach across banks"),
    person("p13", "Grace", "Manila Seed Co (sample)", "Philippines", "investor", "fintech",
           "wallets and remittances"),
    person("p14", "Ali", "Port Klang Freight (sample)", "Malaysia", "corporate", "logistics",
           "warehouse automation"),
    person("p15", "Anh", "Startup One", "Vietnam", "startup", "fintech", "banking partners"),
    person("p16", "Wei", "Startup Two", "Singapore", "startup", "healthtech", "hospital buyers"),
    person("p17", "Joy", "Startup Three", "Philippines", "startup", "logistics", "fleet customers"),
    person("p18", "Aiman", "Startup Four", "Malaysia", "startup", "fintech", "licensing advice"),
    person("p19", "Mai", "Startup Five", "Vietnam", "startup", "healthtech", "clinic partners"),
    person("p20", "Tan", "Startup Six", "Singapore", "startup", "logistics", "port data access"),
    person("p21", "Rizal", "Startup Seven", "Malaysia", "startup", "healthtech", "pharmacy chains"),
    person("p22", "Lea", "Startup Eight", "Philippines", "startup", "fintech", "credit data"),
    person("p23", "Putri", "Startup Nine", "Indonesia", "startup", "agriculture", "drone suppliers"),
    person("p24", "Arun", "Startup Ten", "Thailand", "startup", "agriculture", "soil sensor buyers"),
    person("p25", "Minh", "Startup Eleven", "Vietnam", "startup", "logistics", "cold storage"),
    person("p26", "Nadia", "Startup Twelve", "Malaysia", "startup", "fintech", "merchant networks"),
    person("p27", "Farah", "ASEAN Trade Office (sample)", "Malaysia", "government", "fintech",
           "cross-border policy input"),
    person("p28", "Andi", "Ministry Innovation Desk (sample)", "Indonesia", "government",
           "logistics", "port modernisation"),
    person("p29", "Mei", "Enterprise Programme (sample)", "Singapore", "government", "healthtech",
           "grant applicants"),
    person("p30", "Chai", "Thai Innovation Agency (sample)", "Thailand", "government",
           "healthtech", "regional programmes"),
]

EVENT_OUTCOMES = [
    {"founder": "f1", "id": "p01", "stage": "none"},
    {"founder": "f1", "id": "p02", "stage": "meeting"},
    {"founder": "f2", "id": "p03", "stage": "pilot"},
    {"founder": "f2", "id": "p09", "stage": "deal"},
    {"founder": "f3", "id": "p28", "stage": "meeting"},
]


def event(eid, status, starts_at):
    return {"id": eid, "title": f"Event {eid}", "description": "Sample.", "organizer": "Sample",
            "starts_at": starts_at, "ends_at": starts_at, "venue": "Hall", "city": "Kuala Lumpur",
            "country": "Malaysia", "status": status, "attendee_count": 10, "topics": ["AI"]}


# e2 starts before e1 even though its text sorts later: 09:00+08:00 is 01:00 UTC, 09:00+07:00 is 02:00
EVENTS = [
    event("e1", "upcoming", "2026-11-20T09:00:00+07:00"),
    event("e2", "ongoing", "2026-11-20T09:00:00+08:00"),
    event("e3", "completed", "2026-08-01T09:00:00+08:00"),
    event("e4", "completed", "2026-09-01T09:00:00+08:00"),
    event("e5", "completed", "2026-10-01T09:00:00+08:00"),  # finished, but not attended
    event("e6", "completed", "2026-07-01T09:00:00+08:00"),  # attended, no contacts made
]

EVENT_HISTORY = {
    "attended": ["e3", "e4", "e6", "e1", "gone"],  # e1 hasn't finished, "gone" doesn't exist
    "outcomes": [
        {"event_id": "e3", "id": "p01", "stage": "deal"},
        {"event_id": "e3", "id": "p02", "stage": "pilot"},
        {"event_id": "e3", "id": "p03", "stage": "none"},
        {"event_id": "e4", "id": "p01", "stage": "meeting"},
        {"event_id": "e5", "id": "p01", "stage": "deal"},
    ],
}


@pytest.fixture(autouse=True)
def data_dir(tmp_path, monkeypatch):
    """Every test runs on a throwaway data folder, never the real data/."""
    (tmp_path / "profiles.json").write_text(json.dumps(PROFILES), encoding="utf-8")
    (tmp_path / "event_outcomes.json").write_text(json.dumps(EVENT_OUTCOMES), encoding="utf-8")
    (tmp_path / "events.json").write_text(json.dumps(EVENTS), encoding="utf-8")
    (tmp_path / "event_history.json").write_text(json.dumps(EVENT_HISTORY), encoding="utf-8")
    monkeypatch.setattr(rules, "DATA", tmp_path)
    return tmp_path


@pytest.fixture
def aina():
    return dict(AINA)


@pytest.fixture
def profiles():
    return [dict(p) for p in PROFILES]
