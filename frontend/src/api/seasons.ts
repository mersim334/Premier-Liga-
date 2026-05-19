import { apiGet } from './client'

export type SeasonRow = {
  id: number
  name: string
  start_date: string
  end_date: string | null
  is_current: boolean
  created_at: string
  updated_at: string
}

export function getSeasons(): Promise<SeasonRow[]> {
  return apiGet<SeasonRow[]>('/seasons')
}
