import type { MatchRow } from '../api/matches'

import { sortMatchesForDisplay } from './sortMatches'

export type MatchesByDateGroup = {
  date: string
  rounds: Set<number>
  matches: MatchRow[]
}

/** Grupiše utakmice po datumu (kalendarski raspored kola). */
export function groupMatchesByDate(matches: MatchRow[]): MatchesByDateGroup[] {
  const map = new Map<string, MatchRow[]>()
  for (const m of matches) {
    const d = m.match_date
    const list = map.get(d) ?? []
    list.push(m)
    map.set(d, list)
  }
  const dates = [...map.keys()].sort()
  return dates.map((date) => {
    const ms = sortMatchesForDisplay(map.get(date) ?? [])
    const rounds = new Set<number>()
    for (const x of ms) {
      if (x.round_no != null) rounds.add(x.round_no)
    }
    return { date, rounds, matches: ms }
  })
}

/** Kratak gramatički oblik za BS (1 utakmica / 2–4 utakmice / 5+ utakmica). */
export function matchCountLabelBs(n: number): string {
  if (n === 1) return '1 utakmica'
  const m10 = n % 10
  const m100 = n % 100
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) {
    return `${n} utakmice`
  }
  return `${n} utakmica`
}
