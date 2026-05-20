"""Domena takmičenja — pravila koja dijele API, validacija i (po mogućnosti) baza."""

from .football import (
    DEMO_LEAGUE_TEAM_COUNT,
    HALF_DURATION_MINUTES,
    HALFTIME_INTERVAL_MAX_MINUTES,
    HALFTIME_MINUTES,
    IFAB_REFERENCE_URL,
    LEAGUE_POINTS_DRAW,
    LEAGUE_POINTS_LOSS,
    LEAGUE_POINTS_WIN,
    MATCHDAY_SQUAD_PLAYERS,
    MAX_MINUTE_ADDED,
    MAX_SUBSTITUTIONS_PER_TEAM_TYPICAL,
    PLAYERS_ON_FIELD_PER_TEAM,
    REGULATION_MINUTES,
    assert_match_scores_valid,
    assert_regulation_event_minute,
    public_rules_payload,
)

__all__ = [
    "DEMO_LEAGUE_TEAM_COUNT",
    "HALF_DURATION_MINUTES",
    "HALFTIME_INTERVAL_MAX_MINUTES",
    "HALFTIME_MINUTES",
    "IFAB_REFERENCE_URL",
    "LEAGUE_POINTS_DRAW",
    "LEAGUE_POINTS_LOSS",
    "LEAGUE_POINTS_WIN",
    "MATCHDAY_SQUAD_PLAYERS",
    "MAX_MINUTE_ADDED",
    "MAX_SUBSTITUTIONS_PER_TEAM_TYPICAL",
    "PLAYERS_ON_FIELD_PER_TEAM",
    "REGULATION_MINUTES",
    "assert_match_scores_valid",
    "assert_regulation_event_minute",
    "public_rules_payload",
]
