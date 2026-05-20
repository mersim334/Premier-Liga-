"""Čitanje iz PostgreSQL-a — koristi se kad je DATABASE_URL postavljen."""

from __future__ import annotations

from typing import Any, List, Optional

from app.db import connection


def _fetch_all(sql: str, params: tuple[Any, ...] = ()) -> List[Any]:
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchall()


def _fetch_one(sql: str, params: tuple[Any, ...]) -> Any:
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchone()


def fetch_seasons() -> List[Any]:
    return _fetch_all(
        """
        SELECT id, name, start_date, end_date, is_current, created_at, updated_at
        FROM seasons
        ORDER BY id DESC
        """
    )


def fetch_season(season_id: int) -> Any:
    return _fetch_one(
        """
        SELECT id, name, start_date, end_date, is_current, created_at, updated_at
        FROM seasons
        WHERE id = %s
        """,
        (season_id,),
    )


def fetch_teams() -> List[Any]:
    return _fetch_all(
        """
        SELECT id, name, city, stadium, coach, created_at, updated_at
        FROM teams
        ORDER BY name ASC
        """
    )


def fetch_team(team_id: int) -> Any:
    return _fetch_one(
        """
        SELECT id, name, city, stadium, coach, created_at, updated_at
        FROM teams
        WHERE id = %s
        """,
        (team_id,),
    )


def fetch_matches(season_id: Optional[int] = None) -> List[Any]:
    sql = """
        SELECT id, season_id, round_no, match_date, kickoff_at,
               home_team_id, away_team_id, home_goals, away_goals,
               status, notes, created_at, updated_at
        FROM matches
    """
    params: list[Any] = []
    if season_id is not None:
        sql += " WHERE season_id = %s"
        params.append(season_id)
    sql += " ORDER BY round_no ASC NULLS LAST, match_date ASC NULLS LAST, id ASC"
    return _fetch_all(sql, tuple(params))


def fetch_match(match_id: int) -> Any:
    return _fetch_one(
        """
        SELECT id, season_id, round_no, match_date, kickoff_at,
               home_team_id, away_team_id, home_goals, away_goals,
               status, notes, created_at, updated_at
        FROM matches
        WHERE id = %s
        """,
        (match_id,),
    )


def fetch_players(
    season_id: Optional[int] = None,
    team_id: Optional[int] = None,
) -> List[Any]:
    sql = """
        SELECT id, season_id, team_id, full_name, shirt_number, position,
               created_at, updated_at
        FROM players
        WHERE 1 = 1
    """
    params: list[Any] = []
    if season_id is not None:
        sql += " AND season_id = %s"
        params.append(season_id)
    if team_id is not None:
        sql += " AND team_id = %s"
        params.append(team_id)
    sql += " ORDER BY team_id ASC, shirt_number NULLS LAST, full_name ASC"
    return _fetch_all(sql, tuple(params))


def fetch_player(player_id: int) -> Any:
    return _fetch_one(
        """
        SELECT id, season_id, team_id, full_name, shirt_number, position,
               created_at, updated_at
        FROM players
        WHERE id = %s
        """,
        (player_id,),
    )


def fetch_match_events(match_id: Optional[int] = None) -> List[Any]:
    sql = """
        SELECT id, match_id, team_id, minute, minute_added, event_type,
               player_id, related_player_id, notes, created_at, updated_at
        FROM match_events
    """
    params: list[Any] = []
    if match_id is not None:
        sql += " WHERE match_id = %s"
        params.append(match_id)
    sql += " ORDER BY minute ASC, minute_added NULLS FIRST, id ASC"
    return _fetch_all(sql, tuple(params))


def fetch_match_event(event_id: int) -> Any:
    return _fetch_one(
        """
        SELECT id, match_id, team_id, minute, minute_added, event_type,
               player_id, related_player_id, notes, created_at, updated_at
        FROM match_events
        WHERE id = %s
        """,
        (event_id,),
    )


def fetch_referees() -> List[Any]:
    return _fetch_all(
        """
        SELECT id, full_name, created_at, updated_at
        FROM referees
        ORDER BY id ASC
        """
    )


def fetch_match_referee_assignments_for_season(season_id: int) -> List[Any]:
    return _fetch_all(
        """
        SELECT
            mr.match_id,
            mr.role,
            mr.referee_id,
            r.full_name AS referee_full_name
        FROM match_referees AS mr
        INNER JOIN matches AS m ON m.id = mr.match_id
        INNER JOIN referees AS r ON r.id = mr.referee_id
        WHERE m.season_id = %s
        ORDER BY
            mr.match_id,
            CASE mr.role
                WHEN 'main' THEN 1
                WHEN 'assistant_1' THEN 2
                WHEN 'assistant_2' THEN 3
                WHEN 'fourth_official' THEN 4
            END
        """,
        (season_id,),
    )


def tables_exist_expected() -> dict[str, bool]:
    """Provjera da sve tablice iz šeme postoje u public šemi."""
    names = [
        "seasons",
        "teams",
        "matches",
        "players",
        "match_events",
        "referees",
        "match_referees",
    ]
    sql = """
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = %s
        ) AS ok
    """
    result: dict[str, bool] = {}
    with connection() as conn:
        with conn.cursor() as cur:
            for name in names:
                cur.execute(sql, (name,))
                row = cur.fetchone()
                result[name] = bool(row and row["ok"])
    return result
