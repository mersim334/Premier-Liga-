"""Privremeni mock podaci dok ne vezemo PostgreSQL."""

from __future__ import annotations

from datetime import date, datetime, timezone

_NOW = datetime.now(timezone.utc)

SEASONS = [
    {
        "id": 1,
        "name": "2025/26",
        "start_date": date(2025, 8, 1),
        "end_date": None,
        "is_current": True,
        "created_at": _NOW,
        "updated_at": _NOW,
    },
]

TEAMS = [
    {
        "id": 1,
        "name": "FK Željezničar",
        "city": "Sarajevo",
        "stadium": "Stadion Grbavica",
        "coach": "—",
        "created_at": _NOW,
        "updated_at": _NOW,
    },
    {
        "id": 2,
        "name": "FK Sarajevo",
        "city": "Sarajevo",
        "stadium": "Stadion Asim Ferhatović Hase",
        "coach": "—",
        "created_at": _NOW,
        "updated_at": _NOW,
    },
]

MATCHES = [
    {
        "id": 1,
        "season_id": 1,
        "round_no": 1,
        "match_date": date(2025, 8, 3),
        "kickoff_at": None,
        "home_team_id": 1,
        "away_team_id": 2,
        "home_goals": 2,
        "away_goals": 1,
        "status": "finished",
        "notes": None,
        "created_at": _NOW,
        "updated_at": _NOW,
    },
]

PLAYERS = [
    {
        "id": 1,
        "season_id": 1,
        "team_id": 1,
        "full_name": "Marko Primjer",
        "shirt_number": 10,
        "position": "MF",
        "created_at": _NOW,
        "updated_at": _NOW,
    },
    {
        "id": 2,
        "season_id": 1,
        "team_id": 2,
        "full_name": "Ivan Primjer",
        "shirt_number": 9,
        "position": "FW",
        "created_at": _NOW,
        "updated_at": _NOW,
    },
]

MATCH_EVENTS = [
    {
        "id": 1,
        "match_id": 1,
        "team_id": 1,
        "minute": 23,
        "minute_added": None,
        "event_type": "goal",
        "player_id": 1,
        "related_player_id": None,
        "notes": None,
        "created_at": _NOW,
        "updated_at": _NOW,
    },
]
