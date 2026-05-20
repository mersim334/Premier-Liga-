import { apiGet } from './client'

export type RulesPayload = {
  rules_reference: {
    title: string
    url: string
    note_bs: string
  }
  match_regulation: {
    players_on_field_per_team: number
    half_duration_minutes: number
    regulation_minutes_total: number
    halftime_interval_max_minutes: number
    two_distinct_teams_home_away: boolean
  }
  substitutions: {
    typical_max_per_team: number
    note_bs: string
  }
  squad: {
    players_per_team_in_db: number
    starters_on_field: number
    substitute_bench_slots: number
    note_bs: string
  }
  league_points: {
    win: number
    draw: number
    loss: number
    note_bs: string
  }
  demo_league_format: {
    team_count: number
    double_round_robin: boolean
    rounds_total: number
    matches_per_round: number
    matches_total_regular_season: number
    last_round_no: number
    last_round_match_date: string
    last_match_date: string
    season_calendar_end: string | null
    note_bs: string
  }
  this_application: {
    result_covers: string
    event_minute_min: number
    event_minute_max: number
    minute_added_max: number
  }
}

export function getRules(): Promise<RulesPayload> {
  return apiGet<RulesPayload>('/rules')
}
