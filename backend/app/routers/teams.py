from __future__ import annotations

from typing import Any, List

from fastapi import APIRouter, HTTPException

from app import mock_data
from app.config import get_settings
from app.repos import read as repos_read
from app.schemas import TeamOut

router = APIRouter()


def _rows(rows: List[Any]) -> List[TeamOut]:
    return [TeamOut.model_validate(dict(row)) for row in rows]


@router.get("", response_model=list[TeamOut])
def list_teams():
    settings = get_settings()
    if not settings.database_configured():
        return [TeamOut.model_validate(row) for row in mock_data.TEAMS]
    return _rows(repos_read.fetch_teams())


@router.get("/{team_id}", response_model=TeamOut)
def get_team(team_id: int):
    settings = get_settings()
    if not settings.database_configured():
        for row in mock_data.TEAMS:
            if row["id"] == team_id:
                return TeamOut.model_validate(row)
        raise HTTPException(status_code=404, detail="Tim nije pronađen")

    row = repos_read.fetch_team(team_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Tim nije pronađen")
    return TeamOut.model_validate(dict(row))
