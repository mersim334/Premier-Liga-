import { apiGet } from './client'

export type TeamRow = {
  id: number
  name: string
  city: string | null
  stadium: string | null
  coach: string | null
  created_at: string
  updated_at: string
}

export function getTeams(): Promise<TeamRow[]> {
  return apiGet<TeamRow[]>('/teams')
}

export function getTeam(teamId: number): Promise<TeamRow> {
  return apiGet<TeamRow>(`/teams/${teamId}`)
}
