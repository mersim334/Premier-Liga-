"""Izračun rezultata (domaćin/gost) iz redova match_events za jedan meč."""

from __future__ import annotations

from typing import Any, Iterable, Optional, Tuple


def _event_sort_key(ev: dict[str, Any]) -> tuple:
    mid = int(ev["minute"])
    ma = ev.get("minute_added")
    ma_key = int(ma) if ma is not None else -1
    return (mid, ma_key, int(ev["id"]))


def sorted_match_events_for_score(events: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(events, key=_event_sort_key)


def compute_goals_from_events(
    events: Iterable[dict[str, Any]],
    home_team_id: int,
    away_team_id: int,
) -> tuple[int, int]:
    """Broji golove iz događaja (gol, penal pogodak, autogol)."""
    home = away = 0
    hid = int(home_team_id)
    aid = int(away_team_id)
    for ev in sorted_match_events_for_score(events):
        et = ev["event_type"]
        tid = int(ev["team_id"])
        if et in ("goal", "penalty_scored"):
            if tid == hid:
                home += 1
            elif tid == aid:
                away += 1
        elif et == "own_goal":
            if tid == hid:
                away += 1
            elif tid == aid:
                home += 1
    return home, away


def match_goals_for_db(
    events: list[dict[str, Any]],
    home_team_id: int,
    away_team_id: int,
    *,
    match_status: str | None = None,
) -> tuple[Optional[int], Optional[int]]:
    """Nema događaja → (None, None) osim za status *finished* (0–0 da ostane validan red)."""
    if not events:
        if (match_status or "").strip().lower() == "finished":
            return 0, 0
        return None, None
    h, a = compute_goals_from_events(events, home_team_id, away_team_id)
    return h, a
