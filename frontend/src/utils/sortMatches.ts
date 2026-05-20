import type { MatchRow } from '../api/matches'

/** Redosled za prikaz rasporeda: kolo → datum → id. */
export function sortMatchesForDisplay(rows: MatchRow[]): MatchRow[] {
  return [...rows].sort((a, b) => {
    const ra = a.round_no ?? 9999
    const rb = b.round_no ?? 9999
    if (ra !== rb) return ra - rb
    const da = a.match_date.localeCompare(b.match_date)
    if (da !== 0) return da
    return a.id - b.id
  })
}
