from __future__ import annotations

from typing import Any, List

from fastapi import APIRouter, Query

from app import mock_data
from app.config import get_settings
from app.repos import read as repos_read
from app.schemas import MatchRefereeAssignmentOut

router = APIRouter()


def _rows(rows: List[Any]) -> List[MatchRefereeAssignmentOut]:
    return [MatchRefereeAssignmentOut.model_validate(dict(row)) for row in rows]


def _mock_assignments_for_season(season_id: int) -> List[MatchRefereeAssignmentOut]:
    id_to_name = {int(r["id"]): str(r["full_name"]) for r in mock_data.REFEREES}
    mid_ok = {
        int(m["id"])
        for m in mock_data.MATCHES
        if int(m["season_id"]) == season_id
    }
    rows: list[dict[str, Any]] = []
    for a in mock_data.MATCH_REFEREES:
        mid = int(a["match_id"])
        if mid not in mid_ok:
            continue
        rid = int(a["referee_id"])
        rows.append(
            {
                "match_id": mid,
                "role": a["role"],
                "referee_id": rid,
                "referee_full_name": id_to_name[rid],
            }
        )
    _role_rank = {
        "main": 1,
        "assistant_1": 2,
        "assistant_2": 3,
        "fourth_official": 4,
    }
    rows.sort(
        key=lambda x: (x["match_id"], _role_rank[str(x["role"])]),
    )
    return [MatchRefereeAssignmentOut.model_validate(r) for r in rows]


@router.get("", response_model=list[MatchRefereeAssignmentOut])
def list_match_referees(
    season_id: int = Query(description="ID sezone čiji mečevi nose sudije"),
):
    settings = get_settings()
    if not settings.database_configured():
        return _mock_assignments_for_season(season_id)
    return _rows(repos_read.fetch_match_referee_assignments_for_season(season_id))
