import { apiGet } from './client'

export type StandingsRow = {
  rank: number
  team_id: number
  team_name: string
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
}

export function getStandings(seasonId: number): Promise<StandingsRow[]> {
  const q = new URLSearchParams({ season_id: String(seasonId) })
  return apiGet<StandingsRow[]>(`/standings?${q.toString()}`)
}
