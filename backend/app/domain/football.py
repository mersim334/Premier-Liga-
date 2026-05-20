"""Osnovna pravila fudbala relevantna za ovaj model (IFAB / Laws of the Game).

Sažetak za programere — puni tekst pravila: https://www.theifab.com/laws

Šta ugrađujemo u aplikaciju
----------------------------
* **Law 3 — Igrači:** na terenu je *11* igrača po timu. Broj zamjena u takmičenju
  obično definira pravilnik lige; IFAB za većinu senior takmičenja dozvoljava
  opciju do **5** zamjena po timu (uz dodatne opcije kao concusssion subs).
  U bazi dema drži se **MATCHDAY_SQUAD_PLAYERS** (= 11 + 5) zapisa po klubu po sezoni.
* **Law 7 — Trajanje:** dva jednaka poluvremena od **45** minuta; pauza između
  poluvremena najčešće do **15** minuta (točno određuje takmičenje). Nadoknada
  vremena na kraju svakog poluvremena određuje sudija.
* **Liga bodovanje** (standard 3–1–0): pobjeda **3**, neriješeno **1**, poraz **0**
  bodova — ovo je pravilo *takmičenja*, ne IFAB opće pravilo.

Ograničenja *ovog* dema
-----------------------
* Modelirano je samo **regularno vrijeme** (90 min): bez produžetaka i penala
  u rezultatu utakmice.
* Događaji: ``minute`` u rasponu **1–90**; ``minute_added`` za prikaz nadoknade
  (npr. 45+2 → minute=45, minute_added=2).
"""

from __future__ import annotations

from typing import Any, Optional

# --- Law 7 (trajanje utakmice u regularnom vremenu) ---
HALF_DURATION_MINUTES = 45
REGULATION_MINUTES = HALF_DURATION_MINUTES * 2
# Pauza između poluvremena — gornja granica koju IFAB navodi kao uobičajeni maksimum.
HALFTIME_INTERVAL_MAX_MINUTES = 15

# --- Law 3 (broj igrača; zamjene — tipično takmičarski prag) ---
PLAYERS_ON_FIELD_PER_TEAM = 11
# IFAB: mnoga senior takmičenja koriste do 5 zamjena (konkretno: pravilnik lige).
MAX_SUBSTITUTIONS_PER_TEAM_TYPICAL = 5
# Broj igrača u kadru za meč u ovom modelu baze: starteri + mjesta za zamjene.
MATCHDAY_SQUAD_PLAYERS = (
    PLAYERS_ON_FIELD_PER_TEAM + MAX_SUBSTITUTIONS_PER_TEAM_TYPICAL
)

# --- Nadoknada u poluvremenu (prikaz u bazi / API) ---
MAX_MINUTE_ADDED = 15

# --- Liga (bodovanje) ---
LEAGUE_POINTS_WIN = 3
LEAGUE_POINTS_DRAW = 1
LEAGUE_POINTS_LOSS = 0

# --- Demo liga (broj klubova u seedu / mocku — dvostruki kružni sistem) ---
DEMO_LEAGUE_TEAM_COUNT = 10

IFAB_REFERENCE_URL = "https://www.theifab.com/laws"

# Zadržano ime za kompatibilnost sa starijim importima.
HALFTIME_MINUTES = HALF_DURATION_MINUTES


def assert_regulation_event_minute(
    minute: int,
    minute_added: int | None,
) -> None:
    """Baca ValueError ako minut događaja nije u okviru pravilnika 90 min."""
    if minute < 1 or minute > REGULATION_MINUTES:
        raise ValueError(
            f"Minut događaja mora biti između 1 i {REGULATION_MINUTES} "
            f"(regularno vrijeme), dobijeno: {minute}."
        )
    if minute_added is not None:
        if minute_added < 0 or minute_added > MAX_MINUTE_ADDED:
            raise ValueError(
                "minute_added mora biti između 0 i "
                f"{MAX_MINUTE_ADDED} (nadoknada u poluvremenu), "
                f"dobijeno: {minute_added}."
            )


def assert_match_scores_valid(
    status: str,
    home_goals: Optional[int],
    away_goals: Optional[int],
) -> None:
    """Broj golova ne može biti negativan; završen meč mora imati oba rezultata."""
    st = (status or "").strip().lower()
    if home_goals is not None and home_goals < 0:
        raise ValueError("home_goals ne može biti negativan.")
    if away_goals is not None and away_goals < 0:
        raise ValueError("away_goals ne može biti negativan.")
    if st == "finished":
        if home_goals is None or away_goals is None:
            raise ValueError(
                "Utakmica sa statusom 'finished' mora imati home_goals i away_goals."
            )


def _demo_league_format_from_mock_schedule() -> dict[str, Any]:
    """Metrike dema iz učitanog rasporeda za *trenutnu* sezonu (`is_current`)."""
    from app.mock_data import MATCHES, SEASONS, TEAMS

    current = next((s for s in SEASONS if s.get("is_current")), SEASONS[0])
    sid = int(current["id"])
    subset = [m for m in MATCHES if int(m["season_id"]) == sid]

    n_teams = len(TEAMS)
    rounds_total = max(int(m["round_no"]) for m in subset)
    total = len(subset)
    matches_per_round = total // rounds_total if rounds_total else 0
    last_match_date = max(m["match_date"] for m in subset)
    last_round_no = max(int(m["round_no"]) for m in subset)
    last_round_date = max(
        m["match_date"]
        for m in subset
        if int(m["round_no"]) == last_round_no
    )
    season_end = current.get("end_date") if current else None
    double_rr = (
        total == n_teams * (n_teams - 1)
        and rounds_total == 2 * (n_teams - 1)
        and matches_per_round == n_teams // 2
    )
    return {
        "team_count": n_teams,
        "double_round_robin": double_rr,
        "rounds_total": rounds_total,
        "matches_per_round": matches_per_round,
        "matches_total_regular_season": total,
        "last_round_no": last_round_no,
        "last_round_match_date": last_round_date.isoformat(),
        "last_match_date": last_match_date.isoformat(),
        "season_calendar_end": season_end.isoformat() if season_end else None,
        "note_bs": (
            "Broj kola i raspored utakmica uzimaju se iz tabele `matches` u demu; "
            "kraj kalendara sezone je `seasons.end_date` (postavlja se nakon "
            "generisanja rasporeda: posljednji datum meča + jedna nedjelja rezerve)."
        ),
    }


def public_rules_payload() -> dict[str, Any]:
    """JSON za API /frontend — šta aplikacija tretira kao pravilo."""
    return {
        "rules_reference": {
            "title": "IFAB — Laws of the Game",
            "url": IFAB_REFERENCE_URL,
            "note_bs": (
                "Puni tekst i izmjene pravila na službenoj stranici IFAB-a. "
                "Aplikacija čuva samo sažetak potreban za model podataka."
            ),
        },
        "match_regulation": {
            "players_on_field_per_team": PLAYERS_ON_FIELD_PER_TEAM,
            "half_duration_minutes": HALF_DURATION_MINUTES,
            "regulation_minutes_total": REGULATION_MINUTES,
            "halftime_interval_max_minutes": HALFTIME_INTERVAL_MAX_MINUTES,
            "two_distinct_teams_home_away": True,
        },
        "substitutions": {
            "typical_max_per_team": MAX_SUBSTITUTIONS_PER_TEAM_TYPICAL,
            "note_bs": (
                "Tačan broj zamjena i način izvođenja definisan je pravilnikom takmičenja. "
                "Broj 5 je uobičajeni IFAB prag za mnoga senior takmičenja."
            ),
        },
        "squad": {
            "players_per_team_in_db": MATCHDAY_SQUAD_PLAYERS,
            "starters_on_field": PLAYERS_ON_FIELD_PER_TEAM,
            "substitute_bench_slots": MAX_SUBSTITUTIONS_PER_TEAM_TYPICAL,
            "note_bs": (
                "Po klubu u bazi drži se tačno "
                f"{MATCHDAY_SQUAD_PLAYERS} igrača (11 u igri + 5 na klupi zamjena)."
            ),
        },
        "league_points": {
            "win": LEAGUE_POINTS_WIN,
            "draw": LEAGUE_POINTS_DRAW,
            "loss": LEAGUE_POINTS_LOSS,
            "note_bs": "Ligaški bodovi (3–1–0) — pravilo takmičenja, ne opće IFAB pravilo.",
        },
        "demo_league_format": _demo_league_format_from_mock_schedule(),
        "this_application": {
            "result_covers": "regularno vrijeme (bez produžetka i penala u modelu)",
            "event_minute_min": 1,
            "event_minute_max": REGULATION_MINUTES,
            "minute_added_max": MAX_MINUTE_ADDED,
        },
    }

