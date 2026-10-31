"""Opt-in PostgreSQL checks. All writes are rolled back after each test."""
import json
import os
from contextlib import contextmanager

import psycopg
import pytest
from fastapi.testclient import TestClient

from ai.ai import sample_game_plan
from backend import database, rules
from backend.app import app
from backend.seed_db import seed


@pytest.fixture
def neon(data_dir, monkeypatch):
    url = os.getenv("NEON_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set NEON_TEST_DATABASE_URL to run PostgreSQL integration checks")
    monkeypatch.setenv("DATABASE_URL", url)
    with database.connect(url) as conn:
        with conn.transaction(force_rollback=True):
            @contextmanager
            def connection(url=None):
                with conn.transaction():
                    yield conn

            monkeypatch.setattr(database, "connect", connection)
            seed(data_dir, url=url)
            yield conn


def test_neon_plan_outcomes_and_dashboard_use_sql(neon, monkeypatch, aina):
    from backend import app as backend_app

    monkeypatch.setattr(backend_app, "make_game_plan", sample_game_plan)
    monkeypatch.setattr(rules, "_read", lambda *args: pytest.fail("JSON read in database mode"))
    client = TestClient(app)
    plan = client.post("/api/plan", json=aina)
    assert plan.status_code == 200
    assert len(plan.json()) == 5
    for pid, stage in [("p07", "meeting"), ("p12", "pilot"), ("p07", "deal")]:
        assert client.post("/api/outcomes", json={"id": pid, "stage": stage}).status_code == 200
    assert client.get("/api/outcomes").json() == {"p07": "deal", "p12": "pilot"}
    assert neon.execute("SELECT stage FROM outcomes WHERE id = 'p07'").fetchone()["stage"] == "deal"
    dash = client.get("/api/dashboard")
    assert dash.status_code == 200
    assert dash.json()["contacts"] == 7
    assert dash.json()["pilots"] == 4
    assert client.post("/api/outcomes", json={"id": "missing", "stage": "pilot"}).status_code == 404


def test_seed_preserves_existing_outcomes(neon, data_dir):
    rules.set_outcome("p07", "pilot")
    seed(data_dir)
    assert rules.load_outcomes()["p07"] == "pilot"


def test_database_snapshot_replaces_log_and_preserves_unicode(neon):
    neon.execute("UPDATE profiles SET name = %s WHERE id = %s", ("Nguyễn Thị Hà", "p07"))
    assert next(p for p in rules.load_profiles() if p["id"] == "p07")["name"] == "Nguyễn Thị Hà"
    rules.set_outcome("p12", "meeting")
    rules.save_outcomes({"p07": "pilot"})
    assert rules.load_outcomes() == {"p07": "pilot"}
    rules.save_outcomes({})
    assert rules.load_outcomes() == {}


def test_invalid_seed_is_rolled_back(neon, data_dir):
    people = json.loads((data_dir / "profiles.json").read_text(encoding="utf-8"))
    people[0]["id"] = "test-new-person"
    (data_dir / "profiles.json").write_text(json.dumps(people), encoding="utf-8")
    (data_dir / "event_outcomes.json").write_text(
        json.dumps([{"founder": "bad-seed", "id": "test-new-person", "stage": "invalid"}]), encoding="utf-8"
    )
    with pytest.raises(psycopg.errors.CheckViolation):
        seed(data_dir)
    assert "test-new-person" not in {p["id"] for p in rules.load_profiles()}


def test_database_failure_returns_503_without_leaking_credentials(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://private-credentials")

    def unavailable():
        raise psycopg.OperationalError("private-credentials")

    monkeypatch.setattr(database, "connect", unavailable)
    response = TestClient(app).get("/api/outcomes")
    assert response.status_code == 503
    assert "private-credentials" not in response.text
