import { apiDelete, apiGet, apiPatch, apiPost } from './client'

export const MATCH_EVENT_TYPES = [
  'goal',
  'own_goal',
  'yellow_card',
  'red_card',
  'substitution',
  'penalty_scored',
  'penalty_missed',
] as const

export type MatchEventType = (typeof MATCH_EVENT_TYPES)[number]

export const MATCH_EVENT_TYPE_LABELS: Record<MatchEventType, string> = {
  goal: 'Gol',
  own_goal: 'Autogol',
  yellow_card: 'Žuti karton',
  red_card: 'Crveni karton',
  substitution: 'Zamjena',
  penalty_scored: 'Penal (pogodak)',
  penalty_missed: 'Penal (promašaj)',
}

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

export type MatchEventCreateBody = {
  match_id: number
  team_id: number
  minute: number
  minute_added?: number | null
  event_type: MatchEventType
  player_id?: number | null
  related_player_id?: number | null
  notes?: string | null
}

export type MatchEventPatchBody = Partial<MatchEventCreateBody>

export function getMatchEvents(matchId: number): Promise<MatchEventRow[]> {
  const q = new URLSearchParams({ match_id: String(matchId) })
  return apiGet<MatchEventRow[]>(`/match-events?${q.toString()}`)
}

export function createMatchEvent(body: MatchEventCreateBody): Promise<MatchEventRow> {
  return apiPost<MatchEventRow>('/match-events', body)
}

export function patchMatchEvent(
  eventId: number,
  body: MatchEventPatchBody,
): Promise<MatchEventRow> {
  return apiPatch<MatchEventRow>(`/match-events/${eventId}`, body)
}

export function deleteMatchEvent(eventId: number): Promise<void> {
  return apiDelete(`/match-events/${eventId}`)
}
