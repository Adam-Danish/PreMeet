"""Create the initial tables and import JSON without overwriting existing rows."""
import json
import os

import psycopg

from backend import database


def seed(data_dir=database.ROOT / "data", url=None):
    profiles = json.loads((data_dir / "profiles.json").read_text(encoding="utf-8"))
    event_path = data_dir / "event_outcomes.json"
    event_outcomes = json.loads(event_path.read_text(encoding="utf-8")) if event_path.exists() else []
    outcome_path = data_dir / "outcomes.json"
    outcomes = json.loads(outcome_path.read_text(encoding="utf-8")) if outcome_path.exists() else {}
    schema = (database.ROOT / "backend" / "migrations" / "001_initial.sql").read_text(encoding="utf-8")

    with database.connect(url or os.getenv("DATABASE_URL_UNPOOLED")) as conn:
        conn.execute(schema)
        with conn.cursor() as cursor:
            cursor.executemany(
                """INSERT INTO profiles (id, name, org, country, type, sector, looking_for)
                   VALUES (%(id)s, %(name)s, %(org)s, %(country)s, %(type)s, %(sector)s, %(looking_for)s)
                   ON CONFLICT (id) DO NOTHING""",
                profiles,
            )
            cursor.executemany(
                """INSERT INTO event_outcomes (founder, id, stage)
                   VALUES (%(founder)s, %(id)s, %(stage)s)
                   ON CONFLICT (founder, id) DO NOTHING""",
                event_outcomes,
            )
            cursor.executemany(
                "INSERT INTO outcomes (id, stage) VALUES (%s, %s) ON CONFLICT (id) DO NOTHING",
                list(outcomes.items()),
            )
        count = conn.execute("SELECT count(*) AS count FROM profiles").fetchone()["count"]
    return count


if __name__ == "__main__":
    try:
        print(f"Neon ready: {seed()} profiles. Existing database rows were preserved.")
    except (psycopg.Error, KeyError) as error:
        raise SystemExit(
            f"Neon import failed ({type(error).__name__}). Check DATABASE_URL and the JSON seed files."
        ) from None
