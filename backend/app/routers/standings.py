from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app import mock_data
from app.config import get_settings
from app.repos import read as repos_read
from app.schemas import StandingsRowOut
from app.services.standings import compute_standings

router = APIRouter()


def _ensure_season_exists(season_id: int) -> None:
    settings = get_settings()
    if not settings.database_configured():
        if not any(s["id"] == season_id for s in mock_data.SEASONS):
            raise HTTPException(status_code=404, detail="Sezona nije pronađena")
        return
    row = repos_read.fetch_season(season_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Sezona nije pronađena")


@router.get("", response_model=list[StandingsRowOut])
def list_standings(
    season_id: int = Query(..., description="ID sezone za koju se računa tablica"),
):
    """Ligaška tablica (3-1-0) iz odigranih utakmica s postavljenim rezultatom."""
    _ensure_season_exists(season_id)
    settings = get_settings()
    if not settings.database_configured():
        teams = mock_data.TEAMS
        matches = [m for m in mock_data.MATCHES if m["season_id"] == season_id]
    else:
        teams = repos_read.fetch_teams()
        matches = repos_read.fetch_matches(season_id=season_id)

    rows = compute_standings(season_id, list(teams), list(matches))
    return [StandingsRowOut.model_validate(r) for r in rows]
