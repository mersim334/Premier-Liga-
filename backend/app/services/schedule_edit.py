"""Uređivanje koloslijeda uz očuvanje pravila dvostrukog kružnog sistema.

Odigrana kola se ne mijenjaju — uređuju se samo kola gdje su sve utakmice još zakazane.

U jednoj sezoni isti uredjen par (domaćin, gost) smije se pojaviti najviše jednom,
a isti neuređeni par {A,B} najviše dva meča (domaćin–gost naizmjenično).
Za već postojeće parove računaju se samo završeni mečevi, ne zakazani u budućim kolima.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import date
from typing import Any, Iterable


def _as_match_date(d: Any) -> date:
    if isinstance(d, date):
        return d
    return date.fromisoformat(str(d))

EDITABLE_STATUSES = frozenset({"scheduled"})

# Za dvostruki kružni sistem brojimo samo već odigrane (potvrđene) mečeve.
# Zakazani mečevi u drugim kolima su budući raspored i ne smiju „zaključavati“ parove.
COMMITTED_PAIRING_STATUSES = frozenset({"finished"})


def match_status(m: Any) -> str:
    return str(m.get("status") or "").strip().lower()


def is_committed_for_rr(m: Any) -> bool:
    return match_status(m) in COMMITTED_PAIRING_STATUSES


def other_committed_matches_for_rr(
    matches: Iterable[dict],
    season_id: int,
    exclude_round_no: int,
) -> list[dict]:
    """Utakmice iste sezone izvan *exclude_round_no* koje su već odigrane (za validaciju RR)."""
    sid = int(season_id)
    ex = int(exclude_round_no)
    return [
        m
        for m in matches
        if int(m["season_id"]) == sid
        and int(m["round_no"]) != ex
        and is_committed_for_rr(m)
    ]


def next_editable_round_no(matches: Iterable[dict], season_id: int) -> int | None:
    """Prvo kolo u kojem su sve utakmice još u statusu *scheduled*."""
    by_round: dict[int, list[dict]] = defaultdict(list)
    for m in matches:
        if int(m["season_id"]) != int(season_id):
            continue
        by_round[int(m["round_no"])].append(m)
    for r in sorted(by_round.keys()):
        ms = by_round[r]
        if ms and all(match_status(x) in EDITABLE_STATUSES for x in ms):
            return r
    return None


def team_ids_in_season(matches: Iterable[dict], season_id: int) -> set[int]:
    s: set[int] = set()
    for m in matches:
        if int(m["season_id"]) != int(season_id):
            continue
        s.add(int(m["home_team_id"]))
        s.add(int(m["away_team_id"]))
    return s


def validate_perfect_round(team_ids: set[int], pairings: list[tuple[int, int]]) -> None:
    n = len(team_ids)
    if n % 2 != 0:
        raise ValueError("Broj timova mora biti paran za kolo.")
    if len(pairings) != n // 2:
        raise ValueError(
            f"U kolu mora biti tačno {n // 2} parova za {n} timova, "
            f"dobijeno {len(pairings)}."
        )
    seen: set[int] = set()
    for h, a in pairings:
        if int(h) == int(a):
            raise ValueError("Domaćin i gost ne mogu biti isti tim.")
        for t in (int(h), int(a)):
            if t in seen:
                raise ValueError(f"Tim {t} je više puta u istom kolu.")
            seen.add(t)
    if seen != team_ids:
        raise ValueError("Svaki tim mora tačno jednom igrati u ovom kolu.")


def validate_double_rr_extension(
    other_matches: list[dict],
    proposed: list[tuple[int, int]],
) -> None:
    """*other_matches* — samo već odigrane utakmice iste sezone (osim uređivanog kola)."""
    ord_pairs: set[tuple[int, int]] = set()
    unord_n: dict[tuple[int, int], int] = defaultdict(int)
    for m in other_matches:
        h, a = int(m["home_team_id"]), int(m["away_team_id"])
        if h == a:
            continue
        ord_pairs.add((h, a))
        k = (min(h, a), max(h, a))
        unord_n[k] += 1
        if unord_n[k] > 2:
            raise ValueError("Previše mečeva između istog para u sezoni (podaci).")

    for h, a in proposed:
        h, a = int(h), int(a)
        if (h, a) in ord_pairs:
            raise ValueError(
                "Već postoji utakmica s istim domaćinom i gostom u ovoj sezoni."
            )
        k = (min(h, a), max(h, a))
        if unord_n[k] >= 2:
            raise ValueError(
                "Ovaj par timova već ima dva meča u sezoni — nije dozvoljen treći "
                "(dvostruki kružni sistem)."
            )
        unord_n[k] += 1
        ord_pairs.add((h, a))


def apply_opponent_swap(
    round_rows: list[dict],
    team_a: int,
    team_b: int,
) -> None:
    """Zamijeni protivnike: A–X i B–Y postaju A–Y i B–X (uloga domaćin/gost za A i B umire)."""
    team_a = int(team_a)
    team_b = int(team_b)
    ra = rb = None
    side_a = side_b = None
    for r in round_rows:
        h, a = int(r["home_team_id"]), int(r["away_team_id"])
        if h == team_a:
            ra, side_a = r, "h"
        elif a == team_a:
            ra, side_a = r, "a"
        if h == team_b:
            rb, side_b = r, "h"
        elif a == team_b:
            rb, side_b = r, "a"
    if ra is None or rb is None:
        raise ValueError("Oba tima moraju biti u različitim mečevima ovog kola.")
    if ra is rb:
        raise ValueError("Timovi su u istom meču — koristi ručno prebacivanje domaćina/gosta.")

    opp_a = int(ra["away_team_id"]) if side_a == "h" else int(ra["home_team_id"])
    opp_b = int(rb["away_team_id"]) if side_b == "h" else int(rb["home_team_id"])

    if side_a == "h":
        ra["home_team_id"] = team_a
        ra["away_team_id"] = opp_b
    else:
        ra["home_team_id"] = opp_b
        ra["away_team_id"] = team_a
    if side_b == "h":
        rb["home_team_id"] = team_b
        rb["away_team_id"] = opp_a
    else:
        rb["home_team_id"] = opp_a
        rb["away_team_id"] = team_b


def pairings_from_round_rows(rows: Iterable[dict]) -> list[tuple[int, int]]:
    return [(int(r["home_team_id"]), int(r["away_team_id"])) for r in rows]


def assert_round_date_coherent_with_season(
    matches: Iterable[dict],
    season_id: int,
    round_no: int,
    new_date: date,
) -> None:
    """Novi datum kola mora biti strogo između završetka ranijih i početka kasnijih kola."""
    sid = int(season_id)
    rid = int(round_no)
    prior_max: date | None = None
    later_min: date | None = None
    for m in matches:
        if int(m["season_id"]) != sid:
            continue
        r = int(m["round_no"])
        d = _as_match_date(m["match_date"])
        if r < rid:
            if prior_max is None or d > prior_max:
                prior_max = d
        elif r > rid:
            if later_min is None or d < later_min:
                later_min = d
    if prior_max is not None and new_date <= prior_max:
        raise ValueError(
            "Datum ovog kola mora biti poslije datuma svih ranijih kola "
            f"(poslije {prior_max.isoformat()})."
        )
    if later_min is not None and new_date >= later_min:
        raise ValueError(
            "Datum ovog kola mora biti prije datuma kasnijih kola u rasporedu "
            f"(prije {later_min.isoformat()})."
        )


def assert_round_editable(round_matches: list[dict]) -> None:
    if not round_matches:
        raise ValueError("Prazno kolo.")
    for m in round_matches:
        if match_status(m) not in EDITABLE_STATUSES:
            raise ValueError(
                "Odigrana kola i rezultati se ne mijenjaju. "
                "Uređuje se samo kolo u kojem su sve utakmice još zakazane (scheduled)."
            )
