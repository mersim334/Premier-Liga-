from __future__ import annotations

from typing import Any, List

from fastapi import APIRouter, HTTPException

from app import mock_data
from app.config import get_settings
from app.repos import read as repos_read
from app.schemas import SeasonOut

router = APIRouter()


def _rows(rows: List[Any]) -> List[SeasonOut]:
    return [SeasonOut.model_validate(dict(row)) for row in rows]


@router.get("", response_model=list[SeasonOut])
def list_seasons():
    settings = get_settings()
    if not settings.database_configured():
        rows = sorted(mock_data.SEASONS, key=lambda r: r["id"], reverse=True)
        return [SeasonOut.model_validate(row) for row in rows]
    return _rows(repos_read.fetch_seasons())


@router.get("/{season_id}", response_model=SeasonOut)
def get_season(season_id: int):
    settings = get_settings()
    if not settings.database_configured():
        for row in mock_data.SEASONS:
            if row["id"] == season_id:
                return SeasonOut.model_validate(row)
        raise HTTPException(status_code=404, detail="Sezona nije pronađena")

    row = repos_read.fetch_season(season_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Sezona nije pronađena")
    return SeasonOut.model_validate(dict(row))
