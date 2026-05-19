from __future__ import annotations

from typing import Any, List, Optional

from fastapi import APIRouter, HTTPException, Query

from app import mock_data
from app.config import get_settings
from app.repos import read as repos_read
from app.schemas import PlayerOut

router = APIRouter()


def _rows(rows: List[Any]) -> List[PlayerOut]:
    return [PlayerOut.model_validate(dict(row)) for row in rows]


@router.get("", response_model=list[PlayerOut])
def list_players(
    season_id: Optional[int] = Query(default=None),
    team_id: Optional[int] = Query(default=None),
):
    settings = get_settings()
    if not settings.database_configured():
        rows = mock_data.PLAYERS
        if season_id is not None:
            rows = [r for r in rows if r["season_id"] == season_id]
        if team_id is not None:
            rows = [r for r in rows if r["team_id"] == team_id]
        return [PlayerOut.model_validate(r) for r in rows]
    return _rows(repos_read.fetch_players(season_id=season_id, team_id=team_id))


@router.get("/{player_id}", response_model=PlayerOut)
def get_player(player_id: int):
    settings = get_settings()
    if not settings.database_configured():
        for row in mock_data.PLAYERS:
            if row["id"] == player_id:
                return PlayerOut.model_validate(row)
        raise HTTPException(status_code=404, detail="Igrač nije pronađen")

    row = repos_read.fetch_player(player_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Igrač nije pronađen")
    return PlayerOut.model_validate(dict(row))
