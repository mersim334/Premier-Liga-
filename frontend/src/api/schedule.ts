import { apiGet, apiPost } from './client'
import type { MatchRow } from './matches'

export type NextEditableRoundResponse = {
  round_no: number | null
  matches: MatchRow[]
}

export type RoundPairingInput = {
  match_id: number
  home_team_id: number
  away_team_id: number
}

export function getNextEditableRound(
  seasonId: number,
): Promise<NextEditableRoundResponse> {
  const q = new URLSearchParams({ season_id: String(seasonId) })
  return apiGet<NextEditableRoundResponse>(
    `/schedule/next-editable-round?${q.toString()}`,
  )
}

export function postUpdateRound(body: {
  season_id: number
  round_no: number
  pairings: RoundPairingInput[]
  /** YYYY-MM-DD — isti za sve mečeve u kolu */
  match_date?: string
}): Promise<MatchRow[]> {
  return apiPost<MatchRow[]>('/schedule/update-round', body)
}

export function postSwapOpponents(body: {
  season_id: number
  round_no: number
  team_a: number
  team_b: number
}): Promise<MatchRow[]> {
  return apiPost<MatchRow[]>('/schedule/swap-opponents', body)
}
