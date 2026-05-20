from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, List, Optional

from fastapi import APIRouter, HTTPException, Query, Response

from app import mock_data
from app.config import get_settings
from app.repos import read as repos_read
from app.repos import write as repos_write
from app.schemas import MatchEventCreate, MatchEventOut, MatchEventUpdate
from app.services.match_events_edit import (
    merge_event_update,
    validate_merged_event,
    validate_new_event,
)

router = APIRouter()


def _rows(rows: List[Any]) -> List[MatchEventOut]:
    return [MatchEventOut.model_validate(dict(row)) for row in rows]


def _next_mock_event_id() -> int:
    if not mock_data.MATCH_EVENTS:
        return 1
    return max(int(e["id"]) for e in mock_data.MATCH_EVENTS) + 1


def _mock_create_row(body: MatchEventCreate) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    row = {
        "id": _next_mock_event_id(),
        "match_id": body.match_id,
        "team_id": body.team_id,
        "minute": body.minute,
        "minute_added": body.minute_added,
        "event_type": body.event_type,
        "player_id": body.player_id,
        "related_player_id": body.related_player_id,
        "notes": body.notes,
        "created_at": now,
        "updated_at": now,
    }
    mock_data.MATCH_EVENTS.append(row)
    return row


def _mock_find_event(event_id: int) -> dict[str, Any] | None:
    for e in mock_data.MATCH_EVENTS:
        if int(e["id"]) == event_id:
            return e
    return None


def _sync_mock_match_scores(match_id: int) -> None:
    """Ažurira home_goals/away_goals u mock MATCHES iz događaja."""
    from app.services.match_score_sync import match_goals_for_db

    match = next((x for x in mock_data.MATCHES if int(x["id"]) == match_id), None)
    if match is None:
        return
    evs = [
        dict(e)
        for e in mock_data.MATCH_EVENTS
        if int(e["match_id"]) == match_id
    ]
    hg, ag = match_goals_for_db(
        evs,
        int(match["home_team_id"]),
        int(match["away_team_id"]),
        match_status=str(match.get("status") or ""),
    )
    match["home_goals"] = hg
    match["away_goals"] = ag
    if (
        hg is not None
        and ag is not None
        and str(match.get("status", "")).strip().lower() == "scheduled"
    ):
        match["status"] = "finished"
    match["updated_at"] = datetime.now(timezone.utc)


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
        row = _mock_find_event(event_id)
        if row is None:
            raise HTTPException(status_code=404, detail="Događaj nije pronađen")
        return MatchEventOut.model_validate(row)

    row = repos_read.fetch_match_event(event_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Događaj nije pronađen")
    return MatchEventOut.model_validate(dict(row))


@router.post("", response_model=MatchEventOut, status_code=201)
def create_event(body: MatchEventCreate):
    validate_new_event(body)
    settings = get_settings()
    if not settings.database_configured():
        row = _mock_create_row(body)
        _sync_mock_match_scores(body.match_id)
        return MatchEventOut.model_validate(row)
    row = repos_write.insert_match_event(
        body.match_id,
        body.team_id,
        body.minute,
        body.minute_added,
        body.event_type,
        body.player_id,
        body.related_player_id,
        body.notes,
    )
    repos_write.sync_match_scores_from_events(body.match_id)
    return MatchEventOut.model_validate(row)


@router.patch("/{event_id}", response_model=MatchEventOut)
def patch_event(event_id: int, body: MatchEventUpdate):
    settings = get_settings()
    if not settings.database_configured():
        raw = _mock_find_event(event_id)
        if raw is None:
            raise HTTPException(status_code=404, detail="Događaj nije pronađen")
        existing = MatchEventOut.model_validate(raw)
    else:
        row = repos_read.fetch_match_event(event_id)
        if row is None:
            raise HTTPException(status_code=404, detail="Događaj nije pronađen")
        existing = MatchEventOut.model_validate(dict(row))

    merged = merge_event_update(existing, body)
    validate_merged_event(merged)

    if not settings.database_configured():
        raw = _mock_find_event(event_id)
        assert raw is not None
        raw["match_id"] = merged.match_id
        raw["team_id"] = merged.team_id
        raw["minute"] = merged.minute
        raw["minute_added"] = merged.minute_added
        raw["event_type"] = merged.event_type
        raw["player_id"] = merged.player_id
        raw["related_player_id"] = merged.related_player_id
        raw["notes"] = merged.notes
        raw["updated_at"] = datetime.now(timezone.utc)
        _sync_mock_match_scores(merged.match_id)
        if merged.match_id != existing.match_id:
            _sync_mock_match_scores(existing.match_id)
        return MatchEventOut.model_validate(raw)

    updated = repos_write.update_match_event(
        event_id,
        merged.match_id,
        merged.team_id,
        merged.minute,
        merged.minute_added,
        merged.event_type,
        merged.player_id,
        merged.related_player_id,
        merged.notes,
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Događaj nije pronađen")
    repos_write.sync_match_scores_from_events(merged.match_id)
    if merged.match_id != existing.match_id:
        repos_write.sync_match_scores_from_events(existing.match_id)
    return MatchEventOut.model_validate(updated)


@router.delete("/{event_id}", status_code=204)
def delete_event(event_id: int):
    settings = get_settings()
    if not settings.database_configured():
        raw = _mock_find_event(event_id)
        if raw is None:
            raise HTTPException(status_code=404, detail="Događaj nije pronađen")
        mid = int(raw["match_id"])
        mock_data.MATCH_EVENTS[:] = [
            e for e in mock_data.MATCH_EVENTS if int(e["id"]) != event_id
        ]
        _sync_mock_match_scores(mid)
        return Response(status_code=204)

    row = repos_read.fetch_match_event(event_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Događaj nije pronađen")
    mid = int(dict(row)["match_id"])
    if not repos_write.delete_match_event(event_id):
        raise HTTPException(status_code=404, detail="Događaj nije pronađen")
    repos_write.sync_match_scores_from_events(mid)
    return Response(status_code=204)
