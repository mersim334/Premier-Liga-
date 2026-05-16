from __future__ import annotations

from typing import Any, List, Optional

from fastapi import APIRouter, HTTPException, Query

from app import mock_data
from app.config import get_settings
from app.repos import read as repos_read
from app.schemas import MatchOut

router = APIRouter()


def _rows(rows: List[Any]) -> List[MatchOut]:
    return [MatchOut.model_validate(dict(row)) for row in rows]


@router.get("", response_model=list[MatchOut])
def list_matches(season_id: Optional[int] = Query(default=None)):
    settings = get_settings()
    if not settings.database_configured():
        rows = mock_data.MATCHES
        if season_id is not None:
            rows = [r for r in rows if r["season_id"] == season_id]
        return [MatchOut.model_validate(r) for r in rows]
    return _rows(repos_read.fetch_matches(season_id=season_id))


@router.get("/{match_id}", response_model=MatchOut)
def get_match(match_id: int):
    settings = get_settings()
    if not settings.database_configured():
        for row in mock_data.MATCHES:
            if row["id"] == match_id:
                return MatchOut.model_validate(row)
        raise HTTPException(status_code=404, detail="Utakmica nije pronađena")

    row = repos_read.fetch_match(match_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Utakmica nije pronađena")
    return MatchOut.model_validate(dict(row))
