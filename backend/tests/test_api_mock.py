"""API bez baze — DATABASE_URL prazan."""

import os

import pytest
from fastapi.testclient import TestClient

from app.main import app


def test_force_mock_env_ignores_database_url(monkeypatch):
    """BIH_PREMIER_FORCE_MOCK=1 ne smije koristiti .env bazu (jedna sezona)."""
    monkeypatch.setenv("DATABASE_URL", "postgresql://localhost/would_use_db")
    monkeypatch.setenv("BIH_PREMIER_FORCE_MOCK", "1")
    from app.config import get_settings

    get_settings.cache_clear()
    try:
        assert not get_settings().database_configured()
    finally:
        get_settings.cache_clear()


@pytest.fixture
def client(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("DATABASE_URL", "")
    monkeypatch.delenv("BIH_PREMIER_FORCE_MOCK", raising=False)
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
    assert len(data) >= 2
    assert data[0]["name"]
    assert sum(1 for s in data if s.get("is_current")) == 1


def test_standings_mock_requires_season_id(client):
    r = client.get("/standings")
    assert r.status_code == 422


def test_standings_mock_season_1(client):
    r = client.get("/standings", params={"season_id": 1})
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 10
    assert data[0]["rank"] == 1
    assert data[0]["played"] == 17
    assert data[-1]["played"] == 17
    assert data[0]["points"] >= data[1]["points"]


def test_rules_public(client):
    r = client.get("/rules")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["match_regulation"]["regulation_minutes_total"] == 90
    assert body["league_points"]["win"] == 3
    assert "theifab.com" in body["rules_reference"]["url"]
    assert body["squad"]["players_per_team_in_db"] == 16
    assert body["squad"]["starters_on_field"] == 11
    assert body["squad"]["substitute_bench_slots"] == 5
    dlf = body["demo_league_format"]
    assert dlf["team_count"] == 10
    assert dlf["rounds_total"] == 18
    assert dlf["matches_per_round"] == 5
    assert dlf["matches_total_regular_season"] == 90
    assert dlf["double_round_robin"] is True
    assert dlf["last_round_no"] == 18
    assert dlf["last_match_date"] == "2026-11-28"
    assert dlf["last_round_match_date"] == "2026-11-28"
    assert dlf["season_calendar_end"] == "2026-12-05"


def test_standings_mock_season_2_schedule_only(client):
    r = client.get("/standings", params={"season_id": 2})
    assert r.status_code == 200, r.text
    data = r.json()
    assert len(data) == 10
    for row in data:
        assert row["played"] == 0
        assert row["points"] == 0
        assert row["goals_for"] == 0
        assert row["goals_against"] == 0


def test_schedule_next_editable_round_season_2(client):
    r = client.get("/schedule/next-editable-round", params={"season_id": 2})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["round_no"] == 1
    assert len(body["matches"]) == 5
    assert all(m["status"] == "scheduled" for m in body["matches"])


def test_referees_mock(client):
    r = client.get("/referees")
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 24
    assert data[0]["full_name"]
    assert "id" in data[0]


def test_match_referees_mock_season_1(client):
    r = client.get("/match-referees", params={"season_id": 1})
    assert r.status_code == 200, r.text
    data = r.json()
    assert len(data) == 90 * 4
    roles = {row["role"] for row in data}
    assert roles == {"main", "assistant_1", "assistant_2", "fourth_official"}
    by_match: dict[int, list] = {}
    for row in data:
        by_match.setdefault(row["match_id"], []).append(row)
    assert len(by_match) == 90
    for mid, rows in by_match.items():
        assert len(rows) == 4
        assert len({r["referee_id"] for r in rows}) == 4, mid


def test_schedule_next_editable_round_mock(client):
    r = client.get("/schedule/next-editable-round", params={"season_id": 1})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["round_no"] == 18
    assert len(body["matches"]) == 5
    assert all(m["status"] == "scheduled" for m in body["matches"])


def test_schedule_swap_opponents_mock(client):
    """Zamjena protivnika: isti meč (oba u jednom paru) → 400; validacija RR ostaje aktivna.

    U generisanom demo rasporedu posljednje kolo je jedinstveno određeno zakonima RR
    (samo jedna valjana raspodjela parova), pa zamjena između timova iz različitih
    mečeva tipično vraća 400 — to je očekivano.
    """
    r0 = client.get("/schedule/next-editable-round", params={"season_id": 1})
    assert r0.status_code == 200
    assert r0.json()["round_no"] == 18
    r_same = client.post(
        "/schedule/swap-opponents",
        json={"season_id": 1, "round_no": 18, "team_a": 1, "team_b": 2},
    )
    assert r_same.status_code == 400
    assert "istom meču" in r_same.json()["detail"].lower() or "istom me" in r_same.json()["detail"].lower()
    r_cross = client.post(
        "/schedule/swap-opponents",
        json={"season_id": 1, "round_no": 18, "team_a": 1, "team_b": 3},
    )
    assert r_cross.status_code == 400
    assert r_cross.json().get("detail")


