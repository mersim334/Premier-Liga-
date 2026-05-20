from __future__ import annotations

from datetime import date
from typing import Any

from app.db import connection


def update_match_teams(match_id: int, home_team_id: int, away_team_id: int) -> None:
    sql = """
        UPDATE matches
        SET home_team_id = %s,
            away_team_id = %s,
            updated_at = NOW()
        WHERE id = %s
    """
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (home_team_id, away_team_id, match_id))
        conn.commit()


def bulk_update_match_teams(
    updates: list[dict[str, Any]],
    *,
    match_date: date | None = None,
) -> None:
    """Ažurira domaćina i gosta; *match_date* ako je zadan isti datum za sve redove."""
    if match_date is None:
        sql = """
            UPDATE matches
            SET home_team_id = %s,
                away_team_id = %s,
                updated_at = NOW()
            WHERE id = %s
        """
        with connection() as conn:
            with conn.cursor() as cur:
                for u in updates:
                    cur.execute(
                        sql,
                        (
                            int(u["home_team_id"]),
                            int(u["away_team_id"]),
                            int(u["match_id"]),
                        ),
                    )
            conn.commit()
        return

    sql = """
        UPDATE matches
        SET home_team_id = %s,
            away_team_id = %s,
            match_date = %s,
            updated_at = NOW()
        WHERE id = %s
    """
    with connection() as conn:
        with conn.cursor() as cur:
            for u in updates:
                cur.execute(
                    sql,
                    (
                        int(u["home_team_id"]),
                        int(u["away_team_id"]),
                        match_date,
                        int(u["match_id"]),
                    ),
                )
        conn.commit()


def sync_season_end_date_from_matches(season_id: int) -> None:
    """POSTAVI seasons.end_date = MAX(matches.match_date) + 7 dana za sezonu."""
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE seasons
                SET end_date = (
                    SELECT MAX(match_date) + 7
                    FROM matches
                    WHERE season_id = %s
                ),
                    updated_at = NOW()
                WHERE id = %s
                """,
                (season_id, season_id),
            )
        conn.commit()


def insert_match_event(
    match_id: int,
    team_id: int,
    minute: int,
    minute_added: int | None,
    event_type: str,
    player_id: int | None,
    related_player_id: int | None,
    notes: str | None,
) -> dict[str, Any]:
    sql = """
        INSERT INTO match_events (
            match_id, team_id, minute, minute_added, event_type,
            player_id, related_player_id, notes
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id, match_id, team_id, minute, minute_added, event_type,
                  player_id, related_player_id, notes, created_at, updated_at
    """
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                sql,
                (
                    match_id,
                    team_id,
                    minute,
                    minute_added,
                    event_type,
                    player_id,
                    related_player_id,
                    notes,
                ),
            )
            row = cur.fetchone()
        conn.commit()
    if row is None:
        raise RuntimeError("INSERT match_events nije vratio red.")
    return dict(row)


def update_match_event(
    event_id: int,
    match_id: int,
    team_id: int,
    minute: int,
    minute_added: int | None,
    event_type: str,
    player_id: int | None,
    related_player_id: int | None,
    notes: str | None,
) -> dict[str, Any] | None:
    sql = """
        UPDATE match_events SET
            match_id = %s,
            team_id = %s,
            minute = %s,
            minute_added = %s,
            event_type = %s,
            player_id = %s,
            related_player_id = %s,
            notes = %s,
            updated_at = NOW()
        WHERE id = %s
        RETURNING id, match_id, team_id, minute, minute_added, event_type,
                  player_id, related_player_id, notes, created_at, updated_at
    """
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                sql,
                (
                    match_id,
                    team_id,
                    minute,
                    minute_added,
                    event_type,
                    player_id,
                    related_player_id,
                    notes,
                    event_id,
                ),
            )
            row = cur.fetchone()
        conn.commit()
    return dict(row) if row else None


def delete_match_event(event_id: int) -> bool:
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM match_events WHERE id = %s", (event_id,))
            n = cur.rowcount
        conn.commit()
    return n > 0


def sync_match_scores_from_events(match_id: int) -> None:
    from app.repos import read as repos_read
    from app.services.match_score_sync import match_goals_for_db

    row = repos_read.fetch_match(match_id)
    if row is None:
        return
    m = dict(row)
    ev_rows = repos_read.fetch_match_events(match_id=match_id)
    events = [dict(r) for r in ev_rows]
    hg, ag = match_goals_for_db(
        events,
        int(m["home_team_id"]),
        int(m["away_team_id"]),
        match_status=str(m.get("status") or ""),
    )
    new_status = m["status"]
    if (
        hg is not None
        and ag is not None
        and str(new_status).strip().lower() == "scheduled"
    ):
        new_status = "finished"
    sql = """
        UPDATE matches
        SET home_goals = %s,
            away_goals = %s,
            status = %s,
            updated_at = NOW()
        WHERE id = %s
    """
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (hg, ag, new_status, match_id))
        conn.commit()