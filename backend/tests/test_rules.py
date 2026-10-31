import json
from concurrent.futures import ThreadPoolExecutor

from backend import rules


# Pre-scoring

def test_score_adds_every_signal(aina, profiles):
    budi = profiles[0]  # agriculture 3, Indonesia 2, corporate 2, "pilots"/"plantations" 1
    assert rules.score(aina, budi) == 8


def test_score_is_zero_for_a_stranger(aina):
    stranger = {"sector": "fintech", "country": "Japan", "type": "startup",
                "looking_for": "banking partners"}
    assert rules.score(aina, stranger) == 0


def test_filler_words_do_not_earn_the_needs_point(aina):
    # "and" sits inside "expand" and "brand", which must not count as a match
    p = {"sector": "fintech", "country": "Malaysia", "type": "startup",
         "looking_for": "expand brand reach and the rest"}
    assert rules.score(aina, p) == 0


def test_plurals_and_case_still_match(aina):
    p = {"sector": "fintech", "country": "Malaysia", "type": "startup",
         "looking_for": "PLANTATIONS only"}
    assert rules.score(aina, p) == 1


def test_aina_top_5_are_target_country_agriculture_corporates_and_investors(aina, profiles):
    top5 = rules.prefilter(aina, profiles)[:5]
    for p in top5:
        assert p["sector"] == "agriculture"
        assert p["country"] in aina["target_countries"]
        assert p["type"] in aina["wants"]


def test_prefilter_top_6_is_exactly_the_strong_matches(aina, profiles):
    assert {p["id"] for p in rules.prefilter(aina, profiles)[:6]} == {
        "p01", "p02", "p03", "p04", "p05", "p06"}


def test_prefilter_returns_20_sorted_by_score(aina, profiles):
    top = rules.prefilter(aina, profiles)
    scores = [rules.score(aina, p) for p in top]
    assert len(top) == 20
    assert scores == sorted(scores, reverse=True)


def test_prefilter_with_fewer_people_than_k(aina, profiles):
    assert len(rules.prefilter(aina, profiles[:7])) == 7
    assert rules.prefilter(aina, []) == []


# Loading and saving

def test_files_that_do_not_exist_yet_give_empty_results(data_dir):
    (data_dir / "profiles.json").unlink()
    (data_dir / "event_outcomes.json").unlink()
    assert rules.load_profiles() == []
    assert rules.load_event_outcomes() == []
    assert rules.load_outcomes() == {}


def test_save_then_load(data_dir):
    rules.save_outcomes({"p07": "pilot", "p12": "meeting"})
    assert rules.load_outcomes() == {"p07": "pilot", "p12": "meeting"}
    assert not (data_dir / "outcomes.json.tmp").exists()


def test_set_outcome_adds_and_replaces():
    rules.set_outcome("p01", "meeting")
    rules.set_outcome("p02", "none")
    rules.set_outcome("p01", "deal")
    assert rules.load_outcomes() == {"p01": "deal", "p02": "none"}


def test_quick_taps_do_not_lose_outcomes():
    ids = [f"p{i:02d}" for i in range(40)]
    with ThreadPoolExecutor(8) as pool:
        list(pool.map(lambda pid: rules.set_outcome(pid, "pilot"), ids))
    assert sorted(rules.load_outcomes()) == ids


def test_non_ascii_names_survive_on_every_platform(data_dir):
    people = [{"id": "p01", "name": "Nguyễn Thị Hà"}]
    (data_dir / "profiles.json").write_text(json.dumps(people, ensure_ascii=False),
                                            encoding="utf-8")
    assert rules.load_profiles()[0]["name"] == "Nguyễn Thị Hà"


# Funnel and dashboard

def test_funnel_counts_stage_or_higher():
    stages = ["none", "meeting", "meeting", "pilot", "deal"]
    assert rules.funnel(stages) == {"contacts": 5, "meetings": 4, "pilots": 2, "deals": 1}


def test_funnel_empty():
    assert rules.funnel([]) == {"contacts": 0, "meetings": 0, "pilots": 0, "deals": 0}


def test_funnel_treats_a_typo_as_a_dead_contact():
    assert rules.funnel(["meetings"]) == {"contacts": 1, "meetings": 0, "pilots": 0, "deals": 0}


def test_breakdown_groups_by_field(profiles):
    rows = [{"id": "p01", "stage": "meeting"}, {"id": "p02", "stage": "deal"},
            {"id": "p03", "stage": "none"}]
    result = rules.breakdown(rows, profiles, "country")
    assert result["Indonesia"] == {"contacts": 2, "meetings": 2, "pilots": 1, "deals": 1}
    assert result["Thailand"] == {"contacts": 1, "meetings": 0, "pilots": 0, "deals": 0}


def test_breakdown_keeps_people_with_no_profile(profiles):
    result = rules.breakdown([{"id": "p99", "stage": "none"}], profiles, "country")
    assert result["unknown"]["contacts"] == 1


def test_dashboard_shows_sample_results_before_any_log():
    dash = rules.dashboard()
    assert (dash["contacts"], dash["meetings"], dash["pilots"], dash["deals"]) == (5, 4, 2, 1)


def test_dashboard_adds_the_founders_own_log():
    rules.set_outcome("p04", "pilot")
    dash = rules.dashboard()
    assert (dash["contacts"], dash["meetings"], dash["pilots"], dash["deals"]) == (6, 5, 3, 1)
    assert dash["by_type"]["investor"]["pilots"] == 2


def test_dashboard_with_no_data_at_all(data_dir):
    (data_dir / "profiles.json").unlink()
    (data_dir / "event_outcomes.json").unlink()
    assert rules.dashboard()["contacts"] == 0
