from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Iterator

import psycopg
from psycopg import Connection
from psycopg.rows import dict_row

from app.config import get_settings


@contextmanager
def connection() -> Iterator[Connection[Any]]:
    settings = get_settings()
    if not settings.database_configured():
        raise RuntimeError("DATABASE_URL nije postavljen u .env")
    conn = psycopg.connect(settings.database_url, row_factory=dict_row)
    try:
        yield conn
    finally:
        conn.close()
