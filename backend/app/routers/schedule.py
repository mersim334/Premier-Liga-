from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field, model_validator

from app import mock_data
from app.config import get_settings
from app.repos import read as repos_read
from app.repos import write as repos_write
from app.schemas import MatchOut
from app.services import schedule_edit as sched

router = APIRouter()


def _sync_mock_season_end_date(season_id: int) -> None:
    sms = [
        m
        for m in mock_data.MATCHES
        if int(m["season_id"]) == int(season_id)
    ]
    if not sms:
        return
    last: date = max(m["match_date"] for m in sms)
    end = last + timedelta(days=7)
    _now = datetime.now(timezone.utc)
    for s in mock_data.SEASONS:
        if int(s["id"]) == int(season_id):
            s["end_date"] = end
            s["updated_at"] = _now
            break


def _matches_as_dicts(settings: Any, season_id: int) -> list[dict[str, Any]]:
    if not settings.database_configured():
        return [
            m
            for m in mock_data.MATCHES
            if int(m["season_id"]) == int(season_id)
        ]
    rows = repos_read.fetch_matches(season_id=season_id)
    return [dict(r) for r in rows]


def _round_matches_refs(
    all_ms: list[dict[str, Any]], season_id: int, round_no: int
) -> list[dict[str, Any]]:
    return [
        m
        for m in all_ms
        if int(m["season_id"]) == season_id and int(m["round_no"]) == round_no
    ]


class NextEditableRoundOut(BaseModel):
    round_no: int | None
    matches: list[MatchOut]


@router.get("/next-editable-round", response_model=NextEditableRoundOut)
def get_next_editable_round(season_id: int = Query(..., ge=1)):
    settings = get_settings()
    all_ms = _matches_as_dicts(settings, season_id)
    rno = sched.next_editable_round_no(all_ms, season_id)
    if rno is None:
        return NextEditableRoundOut(round_no=None, matches=[])
    ms = _round_matches_refs(all_ms, season_id, rno)
    ms.sort(key=lambda m: int(m["id"]))
    return NextEditableRoundOut(
        round_no=rno,
        matches=[MatchOut.model_validate(m) for m in ms],
    )


class RoundPairingIn(BaseModel):
    match_id: int
    home_team_id: int
    away_team_id: int

    @model_validator(mode="after")
    def _distinct_teams(self) -> RoundPairingIn:
        if self.home_team_id == self.away_team_id:
            raise ValueError("Domaćin i gost moraju biti različiti.")
        return self


class UpdateRoundIn(BaseModel):
    season_id: int = Field(..., ge=1)
    round_no: int = Field(..., ge=1)
    pairings: list[RoundPairingIn]
    match_date: date | None = Field(
        default=None,
        description="Jedan datum za sve mečeve u kolu; ako nije poslan, match_date ostaje.",
    )


@router.post("/update-round", response_model=list[MatchOut])
def post_update_round(body: UpdateRoundIn):
    settings = get_settings()
    season_id = body.season_id
    round_no = body.round_no

    if not settings.database_configured():
        all_ms = list(mock_data.MATCHES)
    else:
        all_ms = [dict(r) for r in repos_read.fetch_matches(season_id=season_id)]

    round_matches = _round_matches_refs(all_ms, season_id, round_no)
    try:
        sched.assert_round_editable(round_matches)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    ids_expected = {int(m["id"]) for m in round_matches}
    by_id = {p.match_id: p for p in body.pairings}
    if set(by_id.keys()) != ids_expected:
        raise HTTPException(
            status_code=400,
            detail="Mora se poslati tačno jedan zapis po svakom meču u kolu.",
        )

    team_ids = sched.team_ids_in_season(all_ms, season_id)
    proposed = [
        (by_id[mid].home_team_id, by_id[mid].away_team_id)
        for mid in sorted(ids_expected)
    ]
    other = sched.other_committed_matches_for_rr(all_ms, season_id, round_no)

    try:
        sched.validate_perfect_round(team_ids, proposed)
        sched.validate_double_rr_extension(other, proposed)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    if body.match_date is not None:
        try:
            sched.assert_round_date_coherent_with_season(
                all_ms, season_id, round_no, body.match_date
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e

    _now = datetime.now(timezone.utc)
    if not settings.database_configured():
        id_to_row = {int(m["id"]): m for m in mock_data.MATCHES}
        for mid in sorted(ids_expected):
            p = by_id[mid]
            row = id_to_row[mid]
            row["home_team_id"] = p.home_team_id
            row["away_team_id"] = p.away_team_id
            if body.match_date is not None:
                row["match_date"] = body.match_date
            row["updated_at"] = _now
        _sync_mock_season_end_date(season_id)
    else:
        upd = [
            {
                "match_id": mid,
                "home_team_id": by_id[mid].home_team_id,
                "away_team_id": by_id[mid].away_team_id,
            }
            for mid in sorted(ids_expected)
        ]
        repos_write.bulk_update_match_teams(upd, match_date=body.match_date)
        repos_write.sync_season_end_date_from_matches(season_id)

    fresh = _matches_as_dicts(settings, season_id)
    out = _round_matches_refs(fresh, season_id, round_no)
    out.sort(key=lambda m: int(m["id"]))
    return [MatchOut.model_validate(m) for m in out]


class SwapOpponentsIn(BaseModel):
    season_id: int = Field(..., ge=1)
    round_no: int = Field(..., ge=1)
    team_a: int = Field(..., ge=1)
    team_b: int = Field(..., ge=1)


@router.post("/swap-opponents", response_model=list[MatchOut])
def post_swap_opponents(body: SwapOpponentsIn):
    settings = get_settings()
    if body.team_a == body.team_b:
        raise HTTPException(status_code=400, detail="Odaberi dva različita tima.")

    if not settings.database_configured():
        all_ms = list(mock_data.MATCHES)
    else:
        all_ms = [dict(r) for r in repos_read.fetch_matches(season_id=body.season_id)]

    round_matches = _round_matches_refs(all_ms, body.season_id, body.round_no)
    try:
        sched.assert_round_editable(round_matches)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    sim = [{**m} for m in round_matches]
    try:
        sched.apply_opponent_swap(sim, body.team_a, body.team_b)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    proposed = sched.pairings_from_round_rows(sim)
    other = sched.other_committed_matches_for_rr(all_ms, body.season_id, body.round_no)

    team_ids = sched.team_ids_in_season(all_ms, body.season_id)
    try:
        sched.validate_perfect_round(team_ids, proposed)
        sched.validate_double_rr_extension(other, proposed)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    sim_by_id = {int(s["id"]): s for s in sim}
    _now = datetime.now(timezone.utc)
    updates = []
    for m in round_matches:
        sid = int(m["id"])
        m["home_team_id"] = sim_by_id[sid]["home_team_id"]
        m["away_team_id"] = sim_by_id[sid]["away_team_id"]
        m["updated_at"] = _now
        updates.append(
            {
                "match_id": sid,
                "home_team_id": int(m["home_team_id"]),
                "away_team_id": int(m["away_team_id"]),
            }
        )

    if settings.database_configured():
        repos_write.bulk_update_match_teams(updates)

    round_matches.sort(key=lambda m: int(m["id"]))
    return [MatchOut.model_validate(m) for m in round_matches]
