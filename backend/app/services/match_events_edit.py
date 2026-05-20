"""Kreiranje / izmjena događaja na utakmici — validacija u odnosu na meč i igrače."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from app import mock_data
from app.config import get_settings
from app.repos import read as repos_read
from app.schemas import MatchEventCreate, MatchEventOut, MatchEventUpdate


def get_match_row(match_id: int) -> dict[str, Any]:
    settings = get_settings()
    if not settings.database_configured():
        m = next((x for x in mock_data.MATCHES if int(x["id"]) == match_id), None)
        if m is None:
            raise HTTPException(status_code=404, detail="Utakmica nije pronađena.")
        return dict(m)
    row = repos_read.fetch_match(match_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Utakmica nije pronađena.")
    return dict(row)


def assert_team_on_match(team_id: int, match: dict[str, Any]) -> None:
    home = int(match["home_team_id"])
    away = int(match["away_team_id"])
    if int(team_id) not in (home, away):
        raise HTTPException(
            status_code=400,
            detail="Tim događaja mora biti domaćin ili gost na ovoj utakmici.",
        )


def _player_season_team(player_id: int) -> tuple[int, int] | None:
    settings = get_settings()
    if not settings.database_configured():
        pl = next((p for p in mock_data.PLAYERS if int(p["id"]) == player_id), None)
        if pl is None:
            return None
        return int(pl["season_id"]), int(pl["team_id"])
    row = repos_read.fetch_player(player_id)
    if row is None:
        return None
    r = dict(row)
    return int(r["season_id"]), int(r["team_id"])


def assert_players_for_event(
    *,
    season_id: int,
    team_id: int,
    event_type: str,
    player_id: int | None,
    related_player_id: int | None,
) -> None:
    def _check(pid: int, label: str) -> None:
        t = _player_season_team(pid)
        if t is None:
            raise HTTPException(
                status_code=400,
                detail=f"Igrač nije pronađen ({label}).",
            )
        sid, tid = t
        if sid != int(season_id):
            raise HTTPException(
                status_code=400,
                detail=f"Igrač ({label}) mora biti iz iste sezone kao utakmica.",
            )
        if tid != int(team_id):
            raise HTTPException(
                status_code=400,
                detail=f"Igrač ({label}) mora pripadati timu navedenom uz događaj.",
            )

    if event_type == "substitution":
        if player_id is None or related_player_id is None:
            raise HTTPException(
                status_code=400,
                detail="Zamjena zahtijeva igrača koji izlazi i igrača koji ulazi.",
            )
        if player_id == related_player_id:
            raise HTTPException(
                status_code=400,
                detail="Izlazeći i ulazeći igrač moraju biti različiti.",
            )
        _check(player_id, "izlazi")
        _check(related_player_id, "ulazi")
        return

    needs_player = event_type in {
        "goal",
        "own_goal",
        "yellow_card",
        "red_card",
        "penalty_scored",
        "penalty_missed",
    }
    if needs_player:
        if player_id is None:
            raise HTTPException(
                status_code=400,
                detail=f"Događaj tipa «{event_type}» zahtijeva igrača.",
            )
        _check(player_id, "igrač")
    if related_player_id is not None:
        raise HTTPException(
            status_code=400,
            detail="Polje «povezani igrač» smije biti popunjeno samo za zamjenu.",
        )


def validate_new_event(body: MatchEventCreate) -> None:
    match = get_match_row(body.match_id)
    assert_team_on_match(body.team_id, match)
    assert_players_for_event(
        season_id=int(match["season_id"]),
        team_id=int(body.team_id),
        event_type=body.event_type,
        player_id=body.player_id,
        related_player_id=body.related_player_id,
    )


def merge_event_update(existing: MatchEventOut, patch: MatchEventUpdate) -> MatchEventCreate:
    base = existing.model_dump(exclude={"id", "created_at", "updated_at"})
    updates = patch.model_dump(exclude_unset=True)
    base.update(updates)
    return MatchEventCreate.model_validate(base)


def validate_merged_event(merged: MatchEventCreate) -> None:
    validate_new_event(merged)
