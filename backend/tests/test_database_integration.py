"""
Integracija sa pravom bazom — pokreće se samo ako je DATABASE_URL postavljen.

Za punu šemu uključujući sudije: nakon postojećih SQL datoteka pokreni
``postgresql_referees.sql`` pa ``postgresql_match_referees.sql``, zatim seed.

Primjer (PowerShell):
  cd backend
  $env:DATABASE_URL="postgresql://postgres:lozinka@127.0.0.1:5432/bih_premier_liga"
  pytest tests/test_database_integration.py -v

Ako padne validacija na /match-events (minut van 1–90): ponovo učitaj
``Premier Liga/sql/seed_minimal.sql`` ili pokreni ``migrate_match_events_90min.sql``.
"""

from __future__ import annotations

import os
from pathlib import Path

import pytest


def _has_database_config() -> bool:
    """True ako je baza konfigurirana kroz env ili backend/.env (isto kao Settings)."""
    if os.getenv("DATABASE_URL", "").strip():
        return True
    env_file = Path(__file__).resolve().parent.parent / ".env"
    if not env_file.is_file():
        return False
    for line in env_file.read_text(encoding="utf-8").splitlines():
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        key, _, val = s.partition("=")
        key_u = key.strip().upper()
        if key_u in ("DATABASE_URL", "DATABASEURL"):
            return bool(val.strip().strip('"\''))
    return False


pytestmark = pytest.mark.skipif(
    not _has_database_config(),
    reason="Nema DATABASE_URL (env ni backend/.env) — preskačem integracijske testove",
)


@pytest.fixture
def client(monkeypatch):
    # Inače bi ostala varijabla iz dev/test.ps1 i API bi mislio da je mock.
    monkeypatch.delenv("BIH_PREMIER_FORCE_MOCK", raising=False)

    from app.config import get_settings

    get_settings.cache_clear()
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        yield c
    get_settings.cache_clear()


def test_db_health_ok(client):
    r = client.get("/db-health")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "ok", body
    tables = body["tables"]
    assert all(tables.values()), tables


@pytest.mark.parametrize(
    "path, params",
    [
        ("/seasons", None),
        ("/teams", None),
        ("/matches", None),
        ("/players", None),
        ("/match-events", None),
        ("/referees", None),
        ("/match-referees", {"season_id": 1}),
    ],
)
def test_list_endpoints_return_json_array(client, path, params):
    r = client.get(path, params=params or {})
    assert r.status_code == 200, r.text
    assert isinstance(r.json(), list)


def test_schedule_next_editable_round_shape(client):
    r = client.get("/schedule/next-editable-round", params={"season_id": 1})
    assert r.status_code == 200, r.text
    body = r.json()
    assert isinstance(body, dict)
    assert "round_no" in body and "matches" in body
    assert body["matches"] == [] or isinstance(body["matches"], list)


def test_standings_integration(client):
    r = client.get("/seasons")
    assert r.status_code == 200, r.text
    seasons = r.json()
    assert seasons, "Baza mora imati barem jednu sezonu za standings test"
    sid = seasons[0]["id"]

    rs = client.get("/standings", params={"season_id": sid})
    assert rs.status_code == 200, rs.text
    table = rs.json()
    assert isinstance(table, list)
    for row in table:
        assert row["played"] >= 0
        assert row["goal_difference"] == row["goals_for"] - row["goals_against"]
