import { apiGet } from './client'

export type PlayerRow = {
  id: number
  season_id: number
  team_id: number
  full_name: string
  shirt_number: number | null
  position: string | null
  created_at: string
  updated_at: string
}

export function getPlayers(params?: {
  season_id?: number
  team_id?: number
}): Promise<PlayerRow[]> {
  const q = new URLSearchParams()
  if (params?.season_id != null) q.set('season_id', String(params.season_id))
  if (params?.team_id != null) q.set('team_id', String(params.team_id))
  const qs = q.toString()
  return apiGet<PlayerRow[]>(qs ? `/players?${qs}` : '/players')
}

export function getPlayer(playerId: number): Promise<PlayerRow> {
  return apiGet<PlayerRow>(`/players/${playerId}`)
}
