# Gemma 4 calls (owner: Miras)
"""Turn a founder profile and a list of candidates into a ranked event game plan.

make_game_plan(founder, candidates, n=5) -> [{"id", "rank", "why", "opener"}, ...]
sample_game_plan(founder, candidates) -> same shape, no API call

Candidates can have any fields; each one only needs an "id".
"""
import hashlib
import json
import os
import re
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()
CLOUD_MODEL = os.getenv("CLOUD_MODEL", "gemma-4-26b-a4b-it")
LOCAL_MODEL = os.getenv("LOCAL_MODEL", "gemma4:e4b")
USE_LOCAL = os.getenv("USE_LOCAL") == "1"  # skip the cloud entirely (no wifi)
# Tried in order until one answers: Gemini API first, then Gemma on this Mac via Ollama.
MODELS = ([] if USE_LOCAL else list(dict.fromkeys([CLOUD_MODEL, "gemma-4-26b-a4b-it", "gemma-4-31b-it"])))
MODELS.append(LOCAL_MODEL)
CACHE_FILE = Path(__file__).resolve().parent.parent / "data" / "plan_cache.json"
_client = None  # one Gemini client for the whole process; a throwaway one gets closed mid-request

PROMPT = """You help a startup founder plan who to meet at an event.

Founder:
{founder}

Candidates (people attending):
{candidates}

Pick the {n} best people for this founder to meet, best first. For each give:
- why: one sentence (max 20 words) with the concrete business reason, using details from both profiles
- opener: one natural sentence (max 20 words) the founder can say to start the conversation

Never write generic reasons like "great networking opportunity".
Use only ids from the candidates list.
Return ONLY a JSON array, no other text:
[{{"id": "...", "rank": 1, "why": "...", "opener": "..."}}]"""


def _parse(text):
    match = re.search(r"\[.*\]", text, re.S)  # ignore any chatter around the JSON
    return json.loads(match.group(0)) if match else []


def _ask_gemma(prompt, model):
    if model == LOCAL_MODEL:
        import ollama
        res = ollama.chat(model=LOCAL_MODEL, messages=[{"role": "user", "content": prompt}],
                          options={"temperature": 0.2, "num_ctx": 8192})
        return res.message.content
    global _client
    from google import genai
    from google.genai import types
    if _client is None:
        _client = genai.Client(http_options=types.HttpOptions(timeout=45_000))  # ms per model
    res = _client.models.generate_content(
        model=model, contents=prompt,
        config=types.GenerateContentConfig(temperature=0.2))
    return res.text


def _clean(entries, candidates, n):
    """Keep entries whose id is a real candidate, drop duplicates, renumber ranks."""
    known = {str(c["id"]) for c in candidates}
    seen, plan = set(), []
    for e in entries:
        cid = str(e.get("id", ""))
        if cid in known and cid not in seen and e.get("why") and e.get("opener"):
            seen.add(cid)
            plan.append({"id": cid, "rank": len(plan) + 1, "why": e["why"], "opener": e["opener"]})
    return plan[:n]


def _load_cache():
    try:
        return json.loads(CACHE_FILE.read_text())
    except (OSError, ValueError):
        return {}


def _save_cache(cache):
    try:
        CACHE_FILE.parent.mkdir(exist_ok=True)
        CACHE_FILE.write_text(json.dumps(cache, ensure_ascii=False, indent=1))
    except OSError as e:
        print(f"[ai] could not save cache: {e}")


def make_game_plan(founder, candidates, n=5):
    """Ask Gemma for the plan, trying each model in MODELS once; returns [] if all fail.

    Answers are saved to data/plan_cache.json, so the same founder and candidates
    come back instantly, even after a server restart (demo re-runs, video takes).
    """
    n = min(n, len(candidates))
    prompt = PROMPT.format(founder=json.dumps(founder, ensure_ascii=False),
                           candidates=json.dumps(candidates, ensure_ascii=False), n=n)
    key = hashlib.sha256(prompt.encode()).hexdigest()
    cache = _load_cache()
    if key in cache:
        return cache[key]
    for model in MODELS:
        try:
            plan = _clean(_parse(_ask_gemma(prompt, model)), candidates, n)
            if plan:
                print(f"[ai] plan from {model}")
                cache[key] = plan
                _save_cache(cache)
                return plan
        except Exception as e:  # network error, timeout, quota (429), server error, broken JSON
            print(f"[ai] {model} failed: {e}")
    return []


def sample_game_plan(founder, candidates, n=5):
    """Same shape as make_game_plan, without calling Gemma. For building the UI and API."""
    return [{"id": str(c["id"]), "rank": i + 1,
             "why": f"Sample reason for meeting {c.get('name', 'this person')}.",
             "opener": "Sample opener."}
            for i, c in enumerate(candidates[:n])]
