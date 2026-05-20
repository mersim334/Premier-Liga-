"""Izračun ligaške tablice iz utakmica (3-1-0)."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from app.domain.football import (
    LEAGUE_POINTS_DRAW,
    LEAGUE_POINTS_WIN,
)


def _g(row: Any, key: str) -> Any:
    if isinstance(row, Mapping):
        return row[key]
    return getattr(row, key)


def compute_standings(season_id: int, teams: list[Any], matches: list[Any]) -> list[dict[str, Any]]:
    """
    Bodovanje (liga): pobjeda LEAGUE_POINTS_WIN, remi LEAGUE_POINTS_DRAW, poraz 0.
    Ubrojene su samo utakmice sa statusom *finished* i s postavljenim home_goals/away_goals.
    """
    id_to_name: dict[int, str] = {}
    for t in teams:
        tid = int(_g(t, "id"))
        id_to_name[tid] = str(_g(t, "name"))

    stats: dict[int, dict[str, int]] = {
        tid: {"p": 0, "w": 0, "d": 0, "l": 0, "gf": 0, "ga": 0} for tid in id_to_name
    }

    for m in matches:
        if int(_g(m, "season_id")) != season_id:
            continue
        status = str(_g(m, "status") or "").lower()
        if status != "finished":
            continue

        hg = _g(m, "home_goals")
        ag = _g(m, "away_goals")
        if hg is None or ag is None:
            continue

        hg = int(hg)
        ag = int(ag)
        hid = int(_g(m, "home_team_id"))
        aid = int(_g(m, "away_team_id"))
        if hid == aid:
            continue

        for tid in (hid, aid):
            if tid not in stats:
                stats[tid] = {"p": 0, "w": 0, "d": 0, "l": 0, "gf": 0, "ga": 0}
                id_to_name.setdefault(tid, f"Tim #{tid}")

        stats[hid]["p"] += 1
        stats[aid]["p"] += 1
        stats[hid]["gf"] += hg
        stats[hid]["ga"] += ag
        stats[aid]["gf"] += ag
        stats[aid]["ga"] += hg

        if hg > ag:
            stats[hid]["w"] += 1
            stats[aid]["l"] += 1
        elif hg < ag:
            stats[hid]["l"] += 1
            stats[aid]["w"] += 1
        else:
            stats[hid]["d"] += 1
            stats[aid]["d"] += 1

    rows: list[dict[str, Any]] = []
    for tid, st in stats.items():
        gf, ga = st["gf"], st["ga"]
        pts = st["w"] * LEAGUE_POINTS_WIN + st["d"] * LEAGUE_POINTS_DRAW
        rows.append(
            {
                "team_id": tid,
                "team_name": id_to_name.get(tid, f"Tim #{tid}"),
                "played": st["p"],
                "won": st["w"],
                "drawn": st["d"],
                "lost": st["l"],
                "goals_for": gf,
                "goals_against": ga,
                "goal_difference": gf - ga,
                "points": pts,
            }
        )

    rows.sort(
        key=lambda r: (
            -r["points"],
            -r["goal_difference"],
            -r["goals_for"],
            r["team_name"].lower(),
            r["team_id"],
        )
    )

    return [{**row, "rank": i + 1} for i, row in enumerate(rows)]
