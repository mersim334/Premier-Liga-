"""
Integracija sa pravom bazom — pokreće se samo ako je DATABASE_URL postavljen.

Primjer (PowerShell):
  cd backend
  $env:DATABASE_URL="postgresql://postgres:lozinka@127.0.0.1:5432/bih_premier_liga"
  pytest tests/test_database_integration.py -v
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
def client():
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
    "path",
    [
        "/seasons",
        "/teams",
        "/matches",
        "/players",
        "/match-events",
    ],
)
def test_list_endpoints_return_json_array(client, path):
    r = client.get(path)
    assert r.status_code == 200, r.text
    assert isinstance(r.json(), list)
