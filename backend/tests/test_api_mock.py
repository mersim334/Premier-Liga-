"""API bez baze — DATABASE_URL prazan."""

import os

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("DATABASE_URL", "")
    from app.config import get_settings

    get_settings.cache_clear()
    with TestClient(app) as c:
        yield c
    get_settings.cache_clear()


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_db_health_not_configured(client):
    r = client.get("/db-health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "not_configured"


def test_seasons_mock(client):
    r = client.get("/seasons")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["name"]
