"""
Integracija sa pravom bazom — pokreće se samo ako je DATABASE_URL postavljen.

Primjer (PowerShell):
  cd backend
  $env:DATABASE_URL="postgresql://postgres:lozinka@127.0.0.1:5432/bih_premier_liga"
  pytest tests/test_database_integration.py -v
"""

from __future__ import annotations

import os

import pytest

pytestmark = pytest.mark.skipif(
    not os.getenv("DATABASE_URL", "").strip(),
    reason="DATABASE_URL nije postavljen — preskačem integracijske testove",
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
