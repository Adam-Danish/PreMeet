"""Neon connections; the app keeps its JSON mode when DATABASE_URL is unset."""
import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")


def configured():
    return bool(os.getenv("DATABASE_URL"))


def connect(url=None):
    return psycopg.connect(
        url or os.environ["DATABASE_URL"],
        connect_timeout=10,
        row_factory=dict_row,
    )
