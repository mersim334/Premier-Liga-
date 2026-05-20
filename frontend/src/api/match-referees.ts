import { apiGet } from './client'

export type MatchRefereeRole =
  | 'main'
  | 'assistant_1'
  | 'assistant_2'
  | 'fourth_official'

export type MatchRefereeRow = {
  match_id: number
  role: MatchRefereeRole
  referee_id: number
  referee_full_name: string
}

/** Redoslijed u prikazu (G, asist., IV). */
export const MATCH_REFEREE_ROLE_ORDER: Record<MatchRefereeRole, number> = {
  main: 1,
  assistant_1: 2,
  assistant_2: 3,
  fourth_official: 4,
}

export function sortMatchRefereesForDisplay(
  rows: MatchRefereeRow[],
): MatchRefereeRow[] {
  return [...rows].sort(
    (a, b) => MATCH_REFEREE_ROLE_ORDER[a.role] - MATCH_REFEREE_ROLE_ORDER[b.role],
  )
}

export function matchRefereeRoleLabelBs(role: MatchRefereeRole): string {
  const labels: Record<MatchRefereeRole, string> = {
    main: 'Glavni',
    assistant_1: 'Asistent 1',
    assistant_2: 'Asistent 2',
    fourth_official: 'IV sudija',
  }
  return labels[role]
}

export function getMatchReferees(
  seasonId: number,
): Promise<MatchRefereeRow[]> {
  const q = new URLSearchParams({ season_id: String(seasonId) })
  return apiGet<MatchRefereeRow[]>(`/match-referees?${q}`)
}
