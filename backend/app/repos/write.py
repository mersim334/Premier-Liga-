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