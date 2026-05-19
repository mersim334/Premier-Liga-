import { apiGet } from './client'

export type MatchEventRow = {
  id: number
  match_id: number
  team_id: number
  minute: number
  minute_added: number | null
  event_type: string
  player_id: number | null
  related_player_id: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export function getMatchEvents(matchId: number): Promise<MatchEventRow[]> {
  const q = new URLSearchParams({ match_id: String(matchId) })
  return apiGet<MatchEventRow[]>(`/match-events?${q.toString()}`)
}
