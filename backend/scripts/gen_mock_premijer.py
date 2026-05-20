"""
Generise potpuno fiktivne demo podatke (10 klubova × 16 igraca, utakmice, dogadjaji).

Raspored kola: dvostruki kruzni sistem — redno polje `round_no`, `match_date` po kolu.
Nakon generisanja meceva provjerava se da raspored odgovara punom krugu (broj kola,
broj meceva po kolu, ukupno meceva); `seasons.end_date` se uzima od posljednjeg
datuma u `matches` (+ jedna nedjelja rezerve).

Iz foldera backend:
  python scripts/gen_mock_premijer.py

Izlaz:
  app/mock_data.py
  ../Premier Liga/sql/seed_minimal.sql

Napomena: imena klubova, gradova, stadiona i igraca su izmisljena (bez veze uz
stvarne licensirane lige ili osobe). Rezultati su RNG simulacija.
"""

from __future__ import annotations

import random
import sys
import textwrap
from datetime import date, datetime, timedelta, timezone
from pathlib import Path


_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from app.domain.football import DEMO_LEAGUE_TEAM_COUNT, MATCHDAY_SQUAD_PLAYERS

_NOW = datetime.now(timezone.utc)
BACKEND_ROOT = _BACKEND_ROOT


_TEAMS_META: list[tuple[int, str, str, str]] = [
    (1, "AFC Northvale", "Northvale", "Riverside Arena"),
    (2, "CD Crimson Star", "Eastport", "Star Park Stadium"),
    (3, "FK Driftwood City", "Driftwood", "Harbor Ground"),
    (4, "SC Ironfield", "Ironfield", "Foundry Field"),
    (5, "NK Mistral 07", "Mistralton", "Breeze Park"),
    (6, "FC Greenline", "Greenline", "Canal Park Ground"),
    (7, "HSK Thunder Pass", "Thunder Pass", "Ridge Arena"),
    (8, "FK Cobalt Junction", "Cobalt Junction", "Junction Field"),
    (9, "NK Redwood AC", "Redwood", "Timber Stadium"),
    (10, "SC Glacier Town", "Glacier Town", "Icefield Park"),
]

if len(_TEAMS_META) != DEMO_LEAGUE_TEAM_COUNT:
    raise RuntimeError(
        "gen_mock_premijer: broj klubova mora biti jednak "
        f"DEMO_LEAGUE_TEAM_COUNT ({DEMO_LEAGUE_TEAM_COUNT})."
    )

# Prvo kolo subotom nakon administrativnog početka sezone (1. augusta).
_SCHEDULE_DAY0 = date(2025, 8, 2)
_DEMO_SEASON_START = date(2025, 8, 1)

# Sljedeća sezona — samo raspored (sve utakmice zakazane).
_SCHEDULE_DAY0_SEASON_2 = date(2026, 8, 1)
_DEMO_SEASON_2_START = date(2026, 8, 1)


def _season_calendar_end_from_matches(matches: list[dict]) -> date:
    """Kraj kalendarske sezone: datum posljednjeg meča u rasporedu + jedna nedjelja."""
    last = max(m["match_date"] for m in matches)
    return last + timedelta(days=7)


def _assert_schedule_coherent(matches: list[dict], team_count: int) -> None:
    """Raspored kola mora biti pun dvostruki kružni sistem (n timova)."""
    if not matches:
        raise ValueError("Prazan raspored utakmica.")
    n = team_count
    expected_rounds = 2 * (n - 1)
    expected_total = n * (n - 1)
    if len(matches) != expected_total:
        raise ValueError(
            f"Za {n} timova očekivano {expected_total} utakmica (dvostruki krug), "
            f"dobijeno {len(matches)}."
        )
    by_r: dict[int, int] = {}
    for m in matches:
        r = int(m["round_no"])
        by_r[r] = by_r.get(r, 0) + 1
    rounds = sorted(by_r.keys())
    if rounds != list(range(1, rounds[-1] + 1)):
        raise ValueError(f"Kola nisu uzastopna 1…R: {rounds[:6]}…{rounds[-3:]}")
    rmax = rounds[-1]
    if rmax != expected_rounds:
        raise ValueError(
            f"Za {n} timova očekivano {expected_rounds} kola, u rasporedu je do {rmax}."
        )
    per = n // 2
    wrong = sorted(r for r, c in by_r.items() if c != per)
    if wrong:
        raise ValueError(
            f"Svako kolo mora imati {per} utakmica; neispravna kola (prvih 12): {wrong[:12]}"
        )


# 11 startera + tipična klupa od 5 zamjena (IFAB prag) = veličina kadra u bazi.
_POSITIONS_MATCHDAY: tuple[str, ...] = (
    "GK",
    "DF",
    "DF",
    "DF",
    "DF",
    "MF",
    "MF",
    "MF",
    "MF",
    "FW",
    "FW",
    "GK",
    "DF",
    "MF",
    "MF",
    "FW",
)
assert len(_POSITIONS_MATCHDAY) == MATCHDAY_SQUAD_PLAYERS

# Fiktivna imena (nijedno ne predstavlja stvarnog FIFA/lokalnog sudiju).
_REFEREE_NAMES: tuple[str, ...] = (
    "Mael Corwin",
    "Jordan Vale",
    "Stellan Rourke",
    "Davion Merrit",
    "Ellis Norwood",
    "Carsten Hale",
    "Rowan Ashe",
    "Torin Blake",
    "Felix Cray",
    "Garrick Morrow",
    "Iris Calder",
    "Nova Trent",
    "Silas Breck",
    "Adrien Voss",
    "Cameron Pike",
    "Helix Brant",
    "Orion Marsh",
    "Julen Croft",
    "Ren Alder",
    "Tevin Shaw",
    "Maris Holt",
    "Soren Pike",
    "Ewan Calder",
    "Nico Vail",
)

_MATCH_REF_ROLES: tuple[str, ...] = (
    "main",
    "assistant_1",
    "assistant_2",
    "fourth_official",
)


def _build_referees() -> list[dict]:
    return [
        {
            "id": i,
            "full_name": nm,
            "created_at": _NOW,
            "updated_at": _NOW,
        }
        for i, nm in enumerate(_REFEREE_NAMES, start=1)
    ]


def _pick_four_referee_ids(match_index: int, n_refs: int) -> list[int]:
    if n_refs < 4:
        raise ValueError(
            "Potrebno najmanje četiri sudije za kadar (G + 2 asist. + IV)."
        )
    chosen: list[int] = []
    seen: set[int] = set()
    off = 0
    while len(chosen) < 4:
        rid = ((match_index * 7 + off * 13 + 5) % n_refs) + 1
        off += 1
        if rid not in seen:
            seen.add(rid)
            chosen.append(rid)
    return chosen


def _build_match_referees(matches: list[dict], referees: list[dict]) -> list[dict]:
    n = len(referees)
    out: list[dict] = []
    for idx, m in enumerate(matches):
        rids = _pick_four_referee_ids(idx, n)
        for role, rid in zip(_MATCH_REF_ROLES, rids):
            out.append(
                {
                    "match_id": int(m["id"]),
                    "referee_id": rid,
                    "role": role,
                    "created_at": _NOW,
                    "updated_at": _NOW,
                }
            )
    return out


def _strength(team_id: int) -> float:
    idx = team_id - 1
    return 26.5 - idx * 1.85


def _first_half_fixture(team_ids: list[int]) -> list[list[tuple[int, int]]]:
    """Kola prve polusezone (jedan krug): lista parova (domacin, gost).

    Bergerova tablica za paran n: prvi tim fiksiran, ostali rotiraju
    (ne vrtiti cijeli niz — to ponavlja iste parove prije kraja kruga).
    """
    n = len(team_ids)
    rounds: list[list[tuple[int, int]]] = []
    ids = team_ids.copy()
    for r in range(n - 1):
        rnd: list[tuple[int, int]] = []
        for k in range(n // 2):
            a, b = ids[k], ids[n - 1 - k]
            home, away = (a, b) if r % 2 == 0 else (b, a)
            assert home != away, (a, b, r, "domacin i gost moraju biti razliciti")
            rnd.append((home, away))
        rounds.append(rnd)
        ids = [ids[0]] + [ids[-1]] + ids[1:-1]
    return rounds


def _score_match(home: int, away: int, salt: int) -> tuple[int, int]:
    random.seed(salt + 17_731)
    dh = _strength(home) - _strength(away)
    elo = dh + random.gauss(0, 1.05) + 0.62

    if elo > 0.85:
        hg = random.choices([1, 2, 2, 3, 3, 4], weights=[1, 3, 3, 2, 2, 1])[0]
        ag = random.randint(0, max(0, hg - 2))
        if ag >= hg:
            ag = max(0, hg - 1)
        return hg, ag
    if elo < -0.85:
        ag = random.choices([1, 2, 2, 3, 3], weights=[1, 4, 3, 2, 2])[0]
        hg = random.randint(0, max(0, ag - 2))
        if hg >= ag:
            hg = max(0, ag - 1)
        return hg, ag
    if random.random() < 0.34:
        g = random.choices([0, 1, 1, 2], weights=[5, 4, 3, 1])[0]
        return g, g
    if random.random() < 0.52:
        hg = random.choices([1, 2, 3], weights=[3, 4, 2])[0]
        ag = random.randint(0, max(0, hg - 1))
        return hg, ag
    ag = random.choices([1, 2, 3], weights=[3, 4, 2])[0]
    hg = random.randint(0, max(0, ag - 1))
    return hg, ag


def _build_matches() -> list[dict]:
    team_ids = [t[0] for t in _TEAMS_META]
    halve = len(team_ids) - 1
    half = _first_half_fixture(team_ids)
    day0 = _SCHEDULE_DAY0
    matches: list[dict] = []
    mid = 1
    salt = 0

    for rno, rnd in enumerate(half, start=1):
        for home, away in rnd:
            assert home != away
            salt += 1
            hg, ag = _score_match(home, away, salt)
            matches.append(
                {
                    "id": mid,
                    "season_id": 1,
                    "round_no": rno,
                    "match_date": day0 + timedelta(days=(rno - 1) * 7),
                    "kickoff_at": None,
                    "home_team_id": home,
                    "away_team_id": away,
                    "home_goals": hg,
                    "away_goals": ag,
                    "status": "finished",
                    "notes": None,
                    "created_at": _NOW,
                    "updated_at": _NOW,
                }
            )
            mid += 1

    for rno, rnd in enumerate(half, start=1):
        for home, away in rnd:
            salt += 1
            h2, a2 = away, home
            assert h2 != a2
            round_no = halve + rno
            last_round = round_no == 2 * halve
            if last_round:
                matches.append(
                    {
                        "id": mid,
                        "season_id": 1,
                        "round_no": round_no,
                        "match_date": day0 + timedelta(days=(round_no - 1) * 7),
                        "kickoff_at": None,
                        "home_team_id": h2,
                        "away_team_id": a2,
                        "home_goals": None,
                        "away_goals": None,
                        "status": "scheduled",
                        "notes": None,
                        "created_at": _NOW,
                        "updated_at": _NOW,
                    }
                )
            else:
                hg, ag = _score_match(h2, a2, salt + 9000)
                matches.append(
                    {
                        "id": mid,
                        "season_id": 1,
                        "round_no": round_no,
                        "match_date": day0 + timedelta(days=(round_no - 1) * 7),
                        "kickoff_at": None,
                        "home_team_id": h2,
                        "away_team_id": a2,
                        "home_goals": hg,
                        "away_goals": ag,
                        "status": "finished",
                        "notes": None,
                        "created_at": _NOW,
                        "updated_at": _NOW,
                    }
                )
            mid += 1

    return matches


def _build_matches_schedule_only(
    *,
    season_id: int,
    first_match_id: int,
    day0: date,
) -> list[dict]:
    """Puni dvostruki kružni raspored — sve utakmice zakazane, bez rezultata."""
    team_ids = [t[0] for t in _TEAMS_META]
    halve = len(team_ids) - 1
    half = _first_half_fixture(team_ids)
    matches: list[dict] = []
    mid = first_match_id

    for rno, rnd in enumerate(half, start=1):
        for home, away in rnd:
            assert home != away
            matches.append(
                {
                    "id": mid,
                    "season_id": season_id,
                    "round_no": rno,
                    "match_date": day0 + timedelta(days=(rno - 1) * 7),
                    "kickoff_at": None,
                    "home_team_id": home,
                    "away_team_id": away,
                    "home_goals": None,
                    "away_goals": None,
                    "status": "scheduled",
                    "notes": None,
                    "created_at": _NOW,
                    "updated_at": _NOW,
                }
            )
            mid += 1

    for rno, rnd in enumerate(half, start=1):
        for home, away in rnd:
            h2, a2 = away, home
            assert h2 != a2
            round_no = halve + rno
            matches.append(
                {
                    "id": mid,
                    "season_id": season_id,
                    "round_no": round_no,
                    "match_date": day0 + timedelta(days=(round_no - 1) * 7),
                    "kickoff_at": None,
                    "home_team_id": h2,
                    "away_team_id": a2,
                    "home_goals": None,
                    "away_goals": None,
                    "status": "scheduled",
                    "notes": None,
                    "created_at": _NOW,
                    "updated_at": _NOW,
                }
            )
            mid += 1

    return matches


def _build_players(*, season_id: int, first_id: int) -> list[dict]:
    # Potpuno fiktivna imena (bez namjere da predstavljaju stvarne osobe).
    first = [
        "Zorin",
        "Kaelen",
        "Mareno",
        "Drevan",
        "Sirin",
        "Pavonis",
        "Lioran",
        "Nixom",
        "Orindel",
        "Veskan",
        "Tamrel",
        "Rellik",
        "Kormek",
        "Jexar",
        "Fenwick",
        "Corwin",
        "Dael",
        "Miren",
        "Torval",
        "Selimor",
        "Branek",
        "Kornel",
        "Yaris",
        "Zeff",
    ]
    last = [
        "Varnick",
        "Stellor",
        "Corven",
        "Minalar",
        "Prenak",
        "Dostrel",
        "Kivano",
        "Trelik",
        "Norvand",
        "Pressel",
        "Morken",
        "Zellan",
        "Drivok",
        "Kormel",
        "Venar",
        "Stellik",
        "Bramor",
        "Qenlor",
        "Xavren",
        "Morvek",
        "Velnok",
        "Frendak",
        "Quilorv",
    ]
    positions = list(_POSITIONS_MATCHDAY)

    players: list[dict] = []
    pid = first_id
    for tid, _, _, __ in _TEAMS_META:
        for j in range(MATCHDAY_SQUAD_PLAYERS):
            nm = (
                f"{first[(tid * 11 + pid) % len(first)]} "
                f"{last[(pid * 13) % len(last)]}"
            )
            players.append(
                {
                    "id": pid,
                    "season_id": season_id,
                    "team_id": tid,
                    "full_name": nm.strip(),
                    "shirt_number": j + 1,
                    "position": positions[j],
                    "created_at": _NOW,
                    "updated_at": _NOW,
                }
            )
            pid += 1
    return players


def _players_by_team(players: list[dict]) -> dict[int, list[int]]:
    m: dict[int, list[int]] = {tid: [] for tid, *_ in _TEAMS_META}
    for p in players:
        tid = int(p["team_id"])
        m.setdefault(tid, []).append(int(p["id"]))
    for k in m:
        m[k].sort()
    return m


def _regulation_goal_minutes(n: int, match_id: int, salt: int) -> list[int]:
    """Jedinstveni minuti u [1, 90] za svaki gol (regularno vrijeme)."""
    if n <= 0:
        return []
    rng = random.Random(match_id * 10007 + salt * 17)
    slots = list(range(1, 91))
    rng.shuffle(slots)
    return sorted(slots[:n])


def _build_match_events(
    matches: list[dict],
    players: list[dict],
) -> list[dict]:
    """Gol-događaji u regularnom vremenu (minute 1–90)."""
    by_tid = _players_by_team(players)
    events: list[dict] = []
    eid = 1

    for m in matches:
        mid = int(m["id"])
        hid, aid = int(m["home_team_id"]), int(m["away_team_id"])
        hg_raw, ag_raw = m.get("home_goals"), m.get("away_goals")
        if hg_raw is None or ag_raw is None:
            continue
        hg, ag = int(hg_raw), int(ag_raw)
        hp = by_tid[hid]
        ap = by_tid[aid]
        stk_h = mid % len(hp)
        stk_a = mid % len(ap)

        home_minutes = _regulation_goal_minutes(hg, mid, 0)
        for g, minute in enumerate(home_minutes):
            player_id = hp[(stk_h + g) % len(hp)]
            events.append(
                {
                    "id": eid,
                    "match_id": mid,
                    "team_id": hid,
                    "minute": minute,
                    "minute_added": None,
                    "event_type": "goal",
                    "player_id": player_id,
                    "related_player_id": None,
                    "notes": None,
                    "created_at": _NOW,
                    "updated_at": _NOW,
                }
            )
            eid += 1

        away_minutes = _regulation_goal_minutes(ag, mid, 1)
        for g, minute in enumerate(away_minutes):
            player_id = ap[(stk_a + g) % len(ap)]
            events.append(
                {
                    "id": eid,
                    "match_id": mid,
                    "team_id": aid,
                    "minute": minute,
                    "minute_added": None,
                    "event_type": "goal",
                    "player_id": player_id,
                    "related_player_id": None,
                    "notes": None,
                    "created_at": _NOW,
                    "updated_at": _NOW,
                }
            )
            eid += 1

    return events


def _fmt_py_row(d: dict) -> str:
    lines = []
    for k, v in d.items():
        if isinstance(v, str):
            lines.append(f'        "{k}": "{v}",')
        elif v is None:
            lines.append(f'        "{k}": None,')
        elif isinstance(v, bool):
            lines.append(f'        "{k}": {str(v)},')
        elif isinstance(v, datetime):
            lines.append(
                f'        "{k}": datetime({v.year}, {v.month}, {v.day}, '
                f'{v.hour}, {v.minute}, {v.second}, tzinfo=timezone.utc),'
            )
        elif isinstance(v, date):
            lines.append(
                f'        "{k}": date({v.year}, {v.month}, {v.day}),'
            )
        else:
            lines.append(f'        "{k}": {v},')
    return "    {\n" + "\n".join(lines) + "\n    }"


def _write_mock_py(
    parts: tuple[list, list, list, list, list, list, list],
) -> Path:
    seasons, teams, matches, players, match_events, referees, match_referees = parts
    path = BACKEND_ROOT / "app" / "mock_data.py"

    hdr = '''\
"""Mock podaci — fiktivna liga (10 klubova × 16 igrača po sezoni).

Sezona 1 (2025/26): dvostruki kružni sistem s odigranim kola 1–17 i zakazanim 18.
Sezona 2 (2026/27): samo raspored — sve utakmice zakazane, bez rezultata.

Klubovi, igrači i rezultati (gdje postoje) su izmišljeni (RNG / demo).
"""

from __future__ import annotations

from datetime import date, datetime, timezone

_NOW = datetime.now(timezone.utc)

'''

    def blk(name: str, rows: list) -> str:
        inner = ",\n".join(_fmt_py_row(r) for r in rows)
        return f"{name} = [\n{inner},\n]\n\n"

    text = hdr
    text += blk("SEASONS", seasons)
    text += blk("TEAMS", teams)
    text += blk("MATCHES", matches)
    text += blk("PLAYERS", players)
    text += blk("MATCH_EVENTS", match_events)
    text += blk("REFEREES", referees)
    text += blk("MATCH_REFEREES", match_referees)
    path.write_text(text.rstrip() + "\n", encoding="utf-8")
    return path


def _sql_lit(s: str | None) -> str:
    if s is None:
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"


def _match_date_iso(d: date) -> str:
    return f"{d.year:04d}-{d.month:02d}-{d.day:02d}"


def _sql_goal_col(v: object) -> str:
    if v is None:
        return "NULL"
    return str(int(v))


def _write_seed_sql(
    parts: tuple[list, list, list, list, list, list, list],
) -> Path:
    seasons, teams, matches, players, match_events, referees, match_referees = parts
    out = BACKEND_ROOT.parent / "Premier Liga" / "sql" / "seed_minimal.sql"

    lines: list[str] = []

    lines.append(
        textwrap.dedent(
            """\
            -- Demo seed — fiktivna liga (ASCII). 16 igrača po klubu (11+5), ostalo izmisljeno.
            BEGIN;

            TRUNCATE match_events, match_referees, players, matches, teams, seasons, referees RESTART IDENTITY CASCADE;
            """
        ).rstrip()
    )

    for s in seasons:
        ed = s.get("end_date")
        end_sql = "NULL" if ed is None else f"'{_match_date_iso(ed)}'"
        cur = "TRUE" if s.get("is_current") else "FALSE"
        lines.append(
            f"\nINSERT INTO seasons (id, name, start_date, end_date, is_current)\n"
            f"VALUES ({int(s['id'])}, {_sql_lit(s['name'])}, '{_match_date_iso(s['start_date'])}'"
            f", {end_sql}, {cur});\n"
        )

    tvals = ",\n    ".join(
        (
            f"({int(t['id'])}, {_sql_lit(str(t['name']))}, {_sql_lit(str(t['city']))}, "
            f"{_sql_lit(str(t['stadium']))}, NULL)"
        )
        for t in teams
    )
    lines.append(
        "\nINSERT INTO teams (id, name, city, stadium, coach) VALUES\n"
        + f"    {tvals};\n"
    )

    rfvals = ",\n    ".join(
        (f"({int(r['id'])}, {_sql_lit(str(r['full_name']))})" for r in referees)
    )
    lines.append(
        "\nINSERT INTO referees (id, full_name) VALUES\n" + f"    {rfvals};\n"
    )

    mvals = ",\n    ".join(
        (
            f"""({int(m['id'])}, {int(m['season_id'])}, {int(m['round_no'])}, """
            f"'{_match_date_iso(m['match_date'])}', NULL, "
            f"{int(m['home_team_id'])}, {int(m['away_team_id'])}, """
            f"{_sql_goal_col(m['home_goals'])}, {_sql_goal_col(m['away_goals'])}, """
            f"{_sql_lit(str(m['status']))})"
        )
        for m in matches
    )
    lines.append(
        "\nINSERT INTO matches (\n"
        "    id, season_id, round_no, match_date, kickoff_at,\n"
        "    home_team_id, away_team_id, home_goals, away_goals, status\n"
        ") VALUES\n    "
        + mvals
        + ";\n"
    )

    mrr_vals = ",\n    ".join(
        (
            f"({int(x['match_id'])}, {int(x['referee_id'])}, {_sql_lit(str(x['role']))})"
            for x in match_referees
        )
    )
    lines.append(
        "\nINSERT INTO match_referees (match_id, referee_id, role) VALUES\n"
        f"    {mrr_vals};\n"
    )

    pvals = ",\n    ".join(
        (
            f"({int(p['id'])}, {int(p['season_id'])}, {int(p['team_id'])}, "
            f"{_sql_lit(str(p['full_name']))}, {int(p['shirt_number'])}, "
            f"{_sql_lit(str(p['position']))})"
        )
        for p in players
    )
    lines.append(
        "\nINSERT INTO players "
        "(id, season_id, team_id, full_name, shirt_number, position) VALUES\n"
        f"    {pvals};\n"
    )

    evals = ",\n    ".join(
        (
            f"""({int(e['id'])}, {int(e['match_id'])}, {int(e['team_id'])}, """
            f"{int(e['minute'])}, NULL, {_sql_lit(str(e['event_type']))}, """
            f"""{int(e['player_id'])}, NULL)"""
        )
        for e in match_events
    )
    lines.append(
        "\nINSERT INTO match_events (\n"
        "    id, match_id, team_id, minute, minute_added, event_type, player_id,"
        "\n"
        "    related_player_id\n"
        ") VALUES\n    "
        + evals
        + ";\n"
    )

    lines.append(
        textwrap.dedent(
            """

            SELECT setval(pg_get_serial_sequence('seasons', 'id'), COALESCE((SELECT MAX(id) FROM seasons), 1));
            SELECT setval(pg_get_serial_sequence('teams', 'id'), COALESCE((SELECT MAX(id) FROM teams), 1));
            SELECT setval(pg_get_serial_sequence('matches', 'id'), COALESCE((SELECT MAX(id) FROM matches), 1));
            SELECT setval(pg_get_serial_sequence('players', 'id'), COALESCE((SELECT MAX(id) FROM players), 1));
            SELECT setval(pg_get_serial_sequence('match_events', 'id'), COALESCE((SELECT MAX(id) FROM match_events), 1));
            SELECT setval(pg_get_serial_sequence('referees', 'id'), COALESCE((SELECT MAX(id) FROM referees), 1));

            COMMIT;
            """
        ).rstrip()
    )

    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return out


def main() -> None:
    teams = [
        {
            "id": tid,
            "name": nm,
            "city": ct,
            "stadium": st,
            "coach": None,
            "created_at": _NOW,
            "updated_at": _NOW,
        }
        for tid, nm, ct, st in _TEAMS_META
    ]

    matches_s1 = _build_matches()
    _assert_schedule_coherent(matches_s1, len(_TEAMS_META))
    next_match_id = max(int(m["id"]) for m in matches_s1) + 1
    matches_s2 = _build_matches_schedule_only(
        season_id=2,
        first_match_id=next_match_id,
        day0=_SCHEDULE_DAY0_SEASON_2,
    )
    _assert_schedule_coherent(matches_s2, len(_TEAMS_META))
    matches = matches_s1 + matches_s2

    m1 = [m for m in matches_s1 if int(m["season_id"]) == 1]
    m2 = [m for m in matches_s2 if int(m["season_id"]) == 2]
    seasons = [
        {
            "id": 1,
            "name": "2025/26",
            "start_date": _DEMO_SEASON_START,
            "end_date": _season_calendar_end_from_matches(m1),
            "is_current": False,
            "created_at": _NOW,
            "updated_at": _NOW,
        },
        {
            "id": 2,
            "name": "2026/27",
            "start_date": _DEMO_SEASON_2_START,
            "end_date": _season_calendar_end_from_matches(m2),
            "is_current": True,
            "created_at": _NOW,
            "updated_at": _NOW,
        },
    ]

    players_s1 = _build_players(season_id=1, first_id=1)
    next_pid = max(int(p["id"]) for p in players_s1) + 1
    players_s2 = _build_players(season_id=2, first_id=next_pid)
    players = players_s1 + players_s2

    events = _build_match_events(matches_s1, players_s1)
    referees = _build_referees()
    match_referees = _build_match_referees(matches, referees)

    payload = (seasons, teams, matches, players, events, referees, match_referees)
    py_path = _write_mock_py(payload)
    sql_path = _write_seed_sql(payload)

    ng = sum(
        int(m["home_goals"]) + int(m["away_goals"])
        for m in matches
        if m.get("home_goals") is not None and m.get("away_goals") is not None
    )
    print(f"Written {py_path} ({len(matches)} matches)")
    print(f"Written {sql_path}")
    print(f"Players={len(players)}, goal_events={len(events)} (goal rows ~ {ng})")
    print(f"Referees={len(referees)}, match_referee_rows={len(match_referees)}")


if __name__ == "__main__":
    main()
