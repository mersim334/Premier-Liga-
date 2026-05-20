"""
Primijeni PostgreSQL demo seed (10 klubova, mecevi, dogadaji).

Cita DATABASE_URL iz backend/.env preko Settings (isti mehanizam kao uvicorn).

Pokretanje iz foldera backend:

  cd backend
  python scripts/apply_seed.py

Put do SQL datoteke: ../Premier Liga/sql/seed_minimal.sql

Schema: prije seeda u bazi moraju postojati tablice iz Premier Liga/sql/ uključujući
``postgresql_referees.sql`` i ``postgresql_match_referees.sql`` (nakon matches).

Napomena: skripta transakcijski ponovo puni tablice (BEGIN/TRUNCATE/INSERT iz seeda).
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import psycopg

BACKEND_ROOT = Path(__file__).resolve().parent.parent


def _split_postgres_statements(sql: str) -> list[str]:
    """Jednostavni split po ';' izvan jednostrukih navodnika (PostgreSQL '')."""
    stmts: list[str] = []
    buf: list[str] = []
    in_string = False
    i = 0
    n = len(sql)
    while i < n:
        ch = sql[i]
        if in_string:
            buf.append(ch)
            if ch == "'":
                if i + 1 < n and sql[i + 1] == "'":
                    buf.append(sql[i + 1])
                    i += 2
                    continue
                in_string = False
            i += 1
            continue
        if ch == "'":
            in_string = True
            buf.append(ch)
            i += 1
            continue
        if ch == ";":
            part = "".join(buf).strip()
            buf = []
            if part:
                stmts.append(part)
            i += 1
            continue
        buf.append(ch)
        i += 1
    tail = "".join(buf).strip()
    if tail:
        stmts.append(tail)
    return stmts


def _strip_full_line_comments(sql: str) -> str:
    """Uklanja cijele linije koje pocinju s '--' (nema inline komentara u seedu)."""
    lines_out: list[str] = []
    for line in sql.splitlines():
        if line.lstrip().startswith("--"):
            continue
        lines_out.append(line)
    return "\n".join(lines_out)


def _seed_path(repo_root: Path) -> Path:
    p = repo_root / "Premier Liga" / "sql" / "seed_minimal.sql"
    if not p.is_file():
        raise FileNotFoundError(f"Seed fajl nije nadjen: {p}")
    return p


def main() -> int:
    os.chdir(BACKEND_ROOT)
    sys.path.insert(0, str(BACKEND_ROOT))

    from app.config import get_settings

    get_settings.cache_clear()
    settings = get_settings()

    if not settings.database_configured():
        print(
            "Nema DATABASE_URL u backend/.env — seed se ne prima.\n"
            "Za demo iz PostgreSQL-a postavi URL; bez toga koristi mock (zakomentarisani DATABASE_URL).",
            file=sys.stderr,
        )
        return 2

    repo_root = BACKEND_ROOT.parent
    sql_file = _seed_path(repo_root)
    raw = _strip_full_line_comments(sql_file.read_text(encoding="utf-8"))
    stmts = _split_postgres_statements(raw)
    stmts_filtered: list[str] = []
    for s in stmts:
        up = s.lstrip().upper()
        if not up:
            continue
        if up.startswith("BEGIN"):
            continue
        if up.startswith(("COMMIT", "ROLLBACK")):
            continue
        stmts_filtered.append(s)

    dsn = settings.database_url.strip()
    try:
        with psycopg.connect(dsn, autocommit=False) as conn:
            try:
                for st in stmts_filtered:
                    with conn.cursor() as cur:
                        cur.execute(st)
                conn.commit()
            except Exception:
                conn.rollback()
                raise
    except Exception as exc:
        print(f"Greska pri primjeni seed-a: {exc}", file=sys.stderr)
        print(
            '\nSavjeti: Postgres mora radi; baza iz DATABASE_URL mora postojati; '
            'shema (CREATE TABLE ...) mora biti vec kreirana prije prvog INSERT-a.',
            file=sys.stderr,
        )
        return 1

    print(f"OK - primijenjen seed: {sql_file}")
    print("Provjera: GET http://127.0.0.1:8000/teams (trebalo bi 10 timova).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
