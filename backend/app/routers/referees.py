from __future__ import annotations

from typing import Any, List

from fastapi import APIRouter

from app import mock_data
from app.config import get_settings
from app.repos import read as repos_read
from app.schemas import RefereeOut

router = APIRouter()


def _rows(rows: List[Any]) -> List[RefereeOut]:
    return [RefereeOut.model_validate(dict(row)) for row in rows]


@router.get("", response_model=list[RefereeOut])
def list_referees():
    settings = get_settings()
    if not settings.database_configured():
        return [RefereeOut.model_validate(r) for r in mock_data.REFEREES]
    return _rows(repos_read.fetch_referees())
