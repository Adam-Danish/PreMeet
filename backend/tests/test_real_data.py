# Checks Najmi's real files in data/. Each test skips until its file has been pushed.
import json
from datetime import datetime
from pathlib import Path

import pytest

from backend import rules

REAL_DATA = Path(__file__).resolve().parent.parent.parent / "data"
TYPES = {"startup", "investor", "corporate", "government"}
FIELDS = {"id", "name", "org", "country", "type", "sector", "looking_for"}
EVENT_FIELDS = {"id", "title", "description", "organizer", "starts_at", "ends_at", "venue", "city",
                "country", "status", "attendee_count", "topics"}
EVENT_STATUSES = {"upcoming", "ongoing", "completed"}
DEFAULT_DATA = rules.DATA  # captured at import, before the fixture swaps it for a temp folder


def real_file(name):
    path = REAL_DATA / name
    if not path.exists():
        pytest.skip(f"data/{name} not pushed yet")
    return json.loads(path.read_text(encoding="utf-8"))


def test_rules_looks_in_the_repo_data_folder():
    assert DEFAULT_DATA == REAL_DATA


def test_every_profile_is_complete():
    for p in real_file("profiles.json"):
        assert FIELDS <= set(p), f"{p.get('id')} is missing {FIELDS - set(p)}"
        assert p["type"] in TYPES, f"{p['id']} has type {p['type']!r}"


def test_profile_ids_are_unique():
    ids = [p["id"] for p in real_file("profiles.json")]
    assert len(ids) == len(set(ids))


def test_event_outcomes_use_real_people_and_stages():
    ids = {p["id"] for p in real_file("profiles.json")}
    for row in real_file("event_outcomes.json"):
        assert row["id"] in ids, f"{row['id']} is not in profiles.json"
        assert row["stage"] in rules.STAGES, f"{row['id']} has stage {row['stage']!r}"


def test_every_event_matches_the_agreed_format():
    events = real_file("events.json")
    assert len({e["id"] for e in events}) == len(events)
    for e in events:
        assert set(e) == EVENT_FIELDS, f"{e.get('id')} has the wrong fields"
        assert e["status"] in EVENT_STATUSES, f"{e['id']} has status {e['status']!r}"
        starts, ends = datetime.fromisoformat(e["starts_at"]), datetime.fromisoformat(e["ends_at"])
        assert starts.tzinfo and ends.tzinfo, f"{e['id']} needs timezone offsets"
        assert starts < ends, f"{e['id']} ends before it starts"
        assert isinstance(e["attendee_count"], int) and isinstance(e["topics"], list), e["id"]


def test_event_history_uses_real_events_people_and_stages():
    events = {e["id"]: e for e in real_file("events.json")}
    people = {p["id"] for p in real_file("profiles.json")}
    history = real_file("event_history.json")
    assert len(set(history["attended"])) == len(history["attended"])
    for eid in history["attended"]:
        assert events[eid]["status"] == "completed", eid
    for row in history["outcomes"]:
        assert row["event_id"] in history["attended"], row
        assert row["id"] in people, row
        assert row["stage"] in rules.STAGES, row


def test_aina_top_5_on_the_real_profiles():
    aina = real_file("founder.json")
    for p in rules.prefilter(aina, real_file("profiles.json"))[:5]:
        assert p["sector"] == aina["sector"], p["id"]
        assert p["country"] in aina["target_countries"], p["id"]
        assert p["type"] in aina["wants"], p["id"]
