# Checks the API calls exactly as the guide and Adam's events request describe them.
from typing import get_args

import pytest
from fastapi.testclient import TestClient

from ai.ai import sample_game_plan
from backend import app as backend_app
from backend import rules


@pytest.fixture
def client():
    return TestClient(backend_app.app)


@pytest.fixture
def gemma(monkeypatch):
    """Replace the real Gemma call with whatever the test sets. Default: the sample plan."""
    def install(answer):
        monkeypatch.setattr(backend_app, "make_game_plan", answer)
    install(sample_game_plan)
    return install


def test_plan_returns_5_flat_entries_with_the_persons_details(client, aina, gemma):
    res = client.post("/api/plan", json=aina)
    assert res.status_code == 200
    plan = res.json()
    assert len(plan) == 5
    assert [e["rank"] for e in plan] == list(range(1, 6))
    assert {"id", "rank", "name", "org", "country", "type", "why", "opener"} <= set(plan[0])
    assert plan[0]["name"] == "Budi" and plan[0]["org"] == "Sawit Agro (sample)"


def test_plan_gives_gemma_only_the_top_20(client, aina, gemma):
    seen = {}

    def spy(founder, candidates):
        seen["ids"] = [c["id"] for c in candidates]
        return sample_game_plan(founder, candidates)

    gemma(spy)
    client.post("/api/plan", json=aina)
    assert len(seen["ids"]) == 20
    assert seen["ids"][0] == "p01"


def test_plan_really_calls_make_game_plan(client, aina, gemma):
    gemma(lambda f, c: [{"id": "p04", "rank": 1, "why": "Real.", "opener": "Hi."}])
    assert client.post("/api/plan", json=aina).json()[0]["why"] == "Real."


def test_plan_is_empty_when_gemma_fails_so_the_page_shows_its_error(client, aina, gemma):
    gemma(lambda f, c: [])
    res = client.post("/api/plan", json=aina)
    assert res.status_code == 200
    assert res.json() == []


def test_plan_skips_an_id_not_in_profiles(client, aina, gemma):
    gemma(lambda f, c: [{"id": "p99", "rank": 1, "why": "x", "opener": "y"}])
    assert client.post("/api/plan", json=aina).json() == []


def test_plan_with_fewer_than_10_people(client, aina, gemma, data_dir, profiles):
    import json
    (data_dir / "profiles.json").write_text(json.dumps(profiles[:4]), encoding="utf-8")
    assert len(client.post("/api/plan", json=aina).json()) == 4


def test_plan_rejects_a_founder_with_missing_fields(client):
    assert client.post("/api/plan", json={"name": "Aina"}).status_code == 422


def test_get_outcomes_starts_empty(client):
    assert client.get("/api/outcomes").json() == {}


def test_post_outcome_returns_ok_and_saves(client):
    res = client.post("/api/outcomes", json={"id": "p07", "stage": "pilot"})
    assert res.status_code == 200
    assert res.json() == {"ok": True}
    assert client.get("/api/outcomes").json() == {"p07": "pilot"}


def test_post_outcome_keeps_earlier_people(client):
    client.post("/api/outcomes", json={"id": "p07", "stage": "pilot"})
    client.post("/api/outcomes", json={"id": "p12", "stage": "meeting"})
    assert client.get("/api/outcomes").json() == {"p07": "pilot", "p12": "meeting"}


def test_post_outcome_rejects_a_bad_stage(client):
    assert client.post("/api/outcomes", json={"id": "p07", "stage": "signed"}).status_code == 422
    assert client.get("/api/outcomes").json() == {}


def test_accepted_stages_match_rules():
    stage_type = backend_app.Outcome.model_fields["stage"].annotation
    assert list(get_args(stage_type)) == rules.STAGES


def test_dashboard_has_the_four_numbers(client):
    dash = client.get("/api/dashboard").json()
    assert (dash["contacts"], dash["meetings"], dash["pilots"], dash["deals"]) == (5, 4, 2, 1)


def test_dashboard_updates_after_logging_a_pilot(client):
    client.post("/api/outcomes", json={"id": "p04", "stage": "pilot"})
    dash = client.get("/api/dashboard").json()
    assert (dash["contacts"], dash["meetings"], dash["pilots"], dash["deals"]) == (6, 5, 3, 1)
    assert dash["by_country"]["Indonesia"]["pilots"] == 1


def test_get_events_returns_only_upcoming_and_ongoing(client):
    res = client.get("/api/events")
    assert res.status_code == 200
    assert [e["id"] for e in res.json()] == ["e2", "e1"]


def test_get_events_is_an_empty_list_with_no_events(client, data_dir):
    (data_dir / "events.json").unlink()
    res = client.get("/api/events")
    assert res.status_code == 200
    assert res.json() == []


def test_get_event_returns_the_same_shape_as_the_list(client):
    res = client.get("/api/events/e1")
    assert res.status_code == 200
    assert res.json() == client.get("/api/events").json()[1]
    assert set(res.json()) == {"id", "title", "description", "organizer", "starts_at", "ends_at",
                               "venue", "city", "country", "status", "attendee_count", "topics"}


def test_get_event_can_open_a_completed_event(client):
    assert client.get("/api/events/e3").json()["status"] == "completed"


def test_get_event_is_404_when_missing(client):
    assert client.get("/api/events/nope").status_code == 404


def test_event_history_rows_match_adams_format(client):
    res = client.get("/api/event-history")
    assert res.status_code == 200
    row = res.json()[0]
    assert set(row) == {"event", "outcomes"}
    assert row["event"]["status"] == "completed"
    assert row["event"] == client.get(f"/api/events/{row['event']['id']}").json()
    assert set(row["outcomes"]) == {"contacts", "meetings", "pilots", "deals"}


def test_viewing_an_event_does_not_add_it_to_history(client):
    before = client.get("/api/event-history").json()
    assert client.get("/api/events/e5").status_code == 200
    assert client.get("/api/event-history").json() == before
    assert "e5" not in [row["event"]["id"] for row in before]


def test_event_history_is_an_empty_list_with_no_file(client, data_dir):
    (data_dir / "event_history.json").unlink()
    assert client.get("/api/event-history").json() == []


def test_only_the_agreed_routes_exist():
    routes = {(m, r.path) for r in backend_app.app.routes if r.path.startswith("/api")
              for m in r.methods}
    assert routes == {("POST", "/api/plan"), ("GET", "/api/outcomes"),
                      ("POST", "/api/outcomes"), ("GET", "/api/dashboard"),
                      ("GET", "/api/events"), ("GET", "/api/events/{event_id}"),
                      ("GET", "/api/event-history")}


def test_tests_never_touch_real_data(data_dir):
    assert rules.DATA == data_dir
