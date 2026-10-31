# Checks Najmi's real files in data/. Each test skips until its file has been pushed.
import json
from pathlib import Path

import pytest

from backend import rules

REAL_DATA = Path(__file__).resolve().parent.parent.parent / "data"
TYPES = {"startup", "investor", "corporate", "government"}
FIELDS = {"id", "name", "org", "country", "type", "sector", "looking_for"}
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


def test_aina_top_5_on_the_real_profiles():
    aina = real_file("founder.json")
    for p in rules.prefilter(aina, real_file("profiles.json"))[:5]:
        assert p["sector"] == aina["sector"], p["id"]
        assert p["country"] in aina["target_countries"], p["id"]
        assert p["type"] in aina["wants"], p["id"]
