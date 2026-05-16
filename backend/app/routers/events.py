from __future__ import annotations

from typing import Any, List, Optional

from fastapi import APIRouter, HTTPException, Query

from app import mock_data
from app.config import get_settings
from app.repos import read as repos_read
from app.schemas import MatchEventOut

router = APIRouter()


def _rows(rows: List[Any]) -> List[MatchEventOut]:
    return [MatchEventOut.model_validate(dict(row)) for row in rows]


@router.get("", response_model=list[MatchEventOut])
def list_events(match_id: Optional[int] = Query(default=None)):
    settings = get_settings()
    if not settings.database_configured():
        rows = mock_data.MATCH_EVENTS
        if match_id is not None:
            rows = [r for r in rows if r["match_id"] == match_id]
        return [MatchEventOut.model_validate(r) for r in rows]
    return _rows(repos_read.fetch_match_events(match_id=match_id))


@router.get("/{event_id}", response_model=MatchEventOut)
def get_event(event_id: int):
    settings = get_settings()
    if not settings.database_configured():
        for row in mock_data.MATCH_EVENTS:
            if row["id"] == event_id:
                return MatchEventOut.model_validate(row)
        raise HTTPException(status_code=404, detail="Događaj nije pronađen")

    row = repos_read.fetch_match_event(event_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Događaj nije pronađen")
    return MatchEventOut.model_validate(dict(row))
