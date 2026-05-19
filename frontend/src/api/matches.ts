import { apiGet } from './client'

export type MatchRow = {
  id: number
  season_id: number
  round_no: number
  match_date: string
  kickoff_at: string | null
  home_team_id: number
  away_team_id: number
  home_goals: number | null
  away_goals: number | null
  status: string
  notes: string | null
  created_at: string
  updated_at: string
}

export function getMatches(seasonId: number): Promise<MatchRow[]> {
  const q = new URLSearchParams({ season_id: String(seasonId) })
  return apiGet<MatchRow[]>(`/matches?${q.toString()}`)
}
