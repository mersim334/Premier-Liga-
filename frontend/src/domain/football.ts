/** Pravilnik u ovom demu — usklađeno sa backend `GET /rules`. */

export const REGULATION_MINUTES = 90
/** Trajanje jednog poluvremena (Law 7). */
export const HALF_DURATION_MINUTES = 45
/** @deprecated koristi HALF_DURATION_MINUTES (isto značenje). */
export const HALFTIME_MINUTES = HALF_DURATION_MINUTES

export const PLAYERS_ON_FIELD_PER_TEAM = 11
export const HALFTIME_INTERVAL_MAX_MINUTES = 15
export const MAX_SUBSTITUTIONS_PER_TEAM_TYPICAL = 5
/** Broj igrača po klubu u seedu / mocku (11 + 5). */
export const MATCHDAY_SQUAD_PLAYERS =
  PLAYERS_ON_FIELD_PER_TEAM + MAX_SUBSTITUTIONS_PER_TEAM_TYPICAL
export const LEAGUE_POINTS_WIN = 3
export const LEAGUE_POINTS_DRAW = 1
export const LEAGUE_POINTS_LOSS = 0
