# Scoring, outcomes, dashboard numbers (owner: Iman)
import json
import re
import threading
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"   # backend/ → main folder → data/
STAGES = ["none", "meeting", "pilot", "deal"]
STOP_WORDS = {"a", "an", "and", "for", "from", "in", "into", "of", "on", "or", "our",
              "the", "to", "with"}

_save_lock = threading.Lock()


def _read(name, default):
    path = DATA / name
    # utf-8 is explicit because Windows would otherwise default to cp1252
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default


def load_profiles():
    return _read("profiles.json", [])


def load_event_outcomes():
    return _read("event_outcomes.json", [])


def load_outcomes():
    return _read("outcomes.json", {})


def save_outcomes(outcomes):
    # Write to a temp file first, so a crash mid-save can't leave broken JSON behind
    tmp = DATA / "outcomes.json.tmp"
    tmp.write_text(json.dumps(outcomes, indent=2), encoding="utf-8")
    tmp.replace(DATA / "outcomes.json")


def set_outcome(pid, stage):
    # Locked so two quick taps can't overwrite each other
    with _save_lock:
        outcomes = load_outcomes()
        outcomes[pid] = stage
        save_outcomes(outcomes)


def _words(text):
    """Lowercase whole words, with plurals folded so "pilots" matches "pilot"."""
    return {w.rstrip("s") for w in re.findall(r"[a-z0-9]+", text.lower())} - STOP_WORDS


def score(founder, p):
    s = 0
    if p["sector"] == founder["sector"]:
        s += 3
    if p["country"] in founder["target_countries"]:
        s += 2
    if p["type"] in founder["wants"]:
        s += 2
    if _words(founder["needs"]) & _words(p["looking_for"]):
        s += 1
    return s


def prefilter(founder, profiles, k=20):
    return sorted(profiles, key=lambda p: score(founder, p), reverse=True)[:k]


def funnel(stages):
    """A deal also counts as a pilot and a meeting: count 'this stage or higher'.

    An unknown stage counts as a contact that went nowhere.
    """
    rank = {s: i for i, s in enumerate(STAGES)}
    reached = lambda stage: sum(1 for s in stages if rank.get(s, 0) >= rank[stage])
    return {"contacts": len(stages), "meetings": reached("meeting"),
            "pilots": reached("pilot"), "deals": reached("deal")}


def breakdown(rows, profiles, field):
    """One funnel per value of a profile field, such as per country."""
    people = {p["id"]: p for p in profiles}
    groups = {}
    for row in rows:
        value = people.get(row["id"], {}).get(field, "unknown")
        groups.setdefault(value, []).append(row["stage"])
    return {value: funnel(stages) for value, stages in groups.items()}


def dashboard():
    """Other founders' sample results plus this founder's own log, so it's never empty."""
    rows = load_event_outcomes() + [{"id": pid, "stage": stage}
                                    for pid, stage in load_outcomes().items()]
    profiles = load_profiles()
    return {**funnel([r["stage"] for r in rows]),
            "by_country": breakdown(rows, profiles, "country"),
            "by_type": breakdown(rows, profiles, "type")}
