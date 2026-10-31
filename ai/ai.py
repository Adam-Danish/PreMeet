# Gemma 4 calls (owner: Miras)
"""Turn a founder profile and a list of candidates into a ranked event game plan.

make_game_plan(founder, candidates) -> [{"id", "rank", "why", "opener"}, ...]
sample_game_plan(founder, candidates) -> same shape, no API call

Candidates can have any fields; each one only needs an "id".
"""
import json
import os
import re

from dotenv import load_dotenv

load_dotenv()
CLOUD_MODEL = os.getenv("CLOUD_MODEL", "gemma-4-31b-it")
LOCAL_MODEL = os.getenv("LOCAL_MODEL", "gemma4:e4b")
USE_LOCAL = os.getenv("USE_LOCAL") == "1"  # emergency spare: Gemma on this Mac via Ollama

PROMPT = """You help a startup founder plan who to meet at an event.

Founder:
{founder}

Candidates (people attending):
{candidates}

Pick the {n} best people for this founder to meet, best first. For each give:
- why: one sentence with the concrete business reason, using details from both profiles
- opener: one natural sentence the founder can say to start the conversation

Never write generic reasons like "great networking opportunity".
Use only ids from the candidates list.
Return ONLY a JSON array, no other text:
[{{"id": "...", "rank": 1, "why": "...", "opener": "..."}}]"""


def _parse(text):
    match = re.search(r"\[.*\]", text, re.S)  # ignore any chatter around the JSON
    return json.loads(match.group(0)) if match else []


def _ask_gemma(prompt):
    if USE_LOCAL:
        import ollama
        res = ollama.chat(model=LOCAL_MODEL, messages=[{"role": "user", "content": prompt}],
                          options={"temperature": 0.2, "num_ctx": 8192})
        return res.message.content
    from google import genai
    from google.genai import types
    res = genai.Client().models.generate_content(
        model=CLOUD_MODEL, contents=prompt,
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


def make_game_plan(founder, candidates, n=10):
    """Ask Gemma for the plan. Tries twice; returns [] if both attempts fail."""
    n = min(n, len(candidates))
    prompt = PROMPT.format(founder=json.dumps(founder, ensure_ascii=False),
                           candidates=json.dumps(candidates, ensure_ascii=False), n=n)
    for _ in range(2):
        try:
            plan = _clean(_parse(_ask_gemma(prompt)), candidates, n)
            if plan:
                return plan
        except Exception as e:  # network error, quota (429), broken JSON
            print(f"[ai] Gemma call failed: {e}")
    return []


def sample_game_plan(founder, candidates, n=10):
    """Same shape as make_game_plan, without calling Gemma. For building the UI and API."""
    return [{"id": str(c["id"]), "rank": i + 1,
             "why": f"Sample reason for meeting {c.get('name', 'this person')}.",
             "opener": "Sample opener."}
            for i, c in enumerate(candidates[:n])]
