import { useMemo, useState } from 'react'

import { useLigaData } from '../context/LigaDataContext'
import type { MatchRow } from '../api/matches'
import {
  normalizeClubName,
  parseReferenceResultsJson,
  type ReferenceRow,
} from '../utils/referenceResults'
import { sortMatchesForDisplay } from '../utils/sortMatches'

type ComparedRow =
  | {
      kind: 'pair'
      round: number
      homeApp: string
      awayApp: string
      refScore: string
      appScore: string
      status: 'ok' | 'diff_scores'
    }
  | {
      kind: 'ref_only'
      ref: ReferenceRow
    }
  | {
      kind: 'app_only'
      m: MatchRow
      homeApp: string
      awayApp: string
    }

function matchKey(round: number, homeNorm: string, awayNorm: string): string {
  return `${round}|${homeNorm}|${awayNorm}`
}

export function UporediPage() {
  const { selectedSeasonId, matches, resolveTeam, detailLoading } =
    useLigaData()

  const [rawJson, setRawJson] = useState('')
  const [parseErr, setParseErr] = useState<string | null>(null)
  const [compared, setCompared] = useState<ComparedRow[] | null>(null)

  const sortedMatches = useMemo(
    () => sortMatchesForDisplay(matches),
    [matches],
  )

  const exampleJson = `[
  { "kolo": 1, "domacin": "AFC Northvale", "gost": "SC Glacier Town", "domacin_golovi": 3, "gost_golovi": 0 },
  { "kolo": 1, "domacin": "CD Crimson Star", "gost": "NK Redwood AC", "rez": "4:0" }
]`

  function runCompare() {
    setParseErr(null)
    setCompared(null)
    const parsed = parseReferenceResultsJson(rawJson.trim())
    if ('error' in parsed && parsed.error) {
      setParseErr(parsed.error)
      return
    }
    const refRows = parsed as ReferenceRow[]

    const refMap = new Map<string, ReferenceRow>()
    for (const r of refRows) {
      const k = matchKey(
        r.round,
        normalizeClubName(r.home),
        normalizeClubName(r.away),
      )
      refMap.set(k, r)
    }

    const appMap = new Map<string, MatchRow>()
    for (const m of sortedMatches) {
      const home = resolveTeam(m.home_team_id)
      const away = resolveTeam(m.away_team_id)
      const k = matchKey(
        m.round_no,
        normalizeClubName(home),
        normalizeClubName(away),
      )
      appMap.set(k, m)
    }

    const rows: ComparedRow[] = []
    const usedRef = new Set<string>()
    const usedApp = new Set<string>()

    for (const m of sortedMatches) {
      const homeApp = resolveTeam(m.home_team_id)
      const awayApp = resolveTeam(m.away_team_id)
      const k = matchKey(
        m.round_no,
        normalizeClubName(homeApp),
        normalizeClubName(awayApp),
      )
      const ref = refMap.get(k)
      if (ref) {
        usedRef.add(k)
        usedApp.add(k)
        const appScore =
          m.home_goals != null && m.away_goals != null
            ? `${m.home_goals}:${m.away_goals}`
            : '—'
        const refScore = `${ref.homeGoals}:${ref.awayGoals}`
        let status: 'ok' | 'diff_scores' = 'ok'
        if (refScore !== appScore) status = 'diff_scores'
        rows.push({
          kind: 'pair',
          round: m.round_no,
          homeApp,
          awayApp,
          refScore,
          appScore,
          status,
        })
      }
    }

    for (const [k, ref] of refMap) {
      if (!usedRef.has(k)) {
        rows.push({ kind: 'ref_only', ref })
      }
    }

    for (const [k, m] of appMap) {
      if (!usedApp.has(k)) {
        rows.push({
          kind: 'app_only',
          m,
          homeApp: resolveTeam(m.home_team_id),
          awayApp: resolveTeam(m.away_team_id),
        })
      }
    }

    rows.sort((a, b) => {
      const ra =
        a.kind === 'pair'
          ? a.round
          : a.kind === 'ref_only'
            ? a.ref.round
            : a.m.round_no
      const rb =
        b.kind === 'pair'
          ? b.round
          : b.kind === 'ref_only'
            ? b.ref.round
            : b.m.round_no
      if (ra !== rb) return ra - rb
      const ha =
        a.kind === 'pair'
          ? a.homeApp
          : a.kind === 'ref_only'
            ? a.ref.home
            : a.homeApp
      const hb =
        b.kind === 'pair'
          ? b.homeApp
          : b.kind === 'ref_only'
            ? b.ref.home
            : b.homeApp
      return ha.localeCompare(hb, 'bs')
    })

    setCompared(rows)
  }

  if (selectedSeasonId == null) {
    return (
      <section className="compare-block">
        <p className="muted">Odaberi sezonu u toolbaru.</p>
      </section>
    )
  }

  return (
    <section className="compare-block" aria-label="Uporedba rezultata">
      <div className="section-card">
        <div className="section-head">
          <h2>Uporedi sa referencom</h2>
          <p className="section-hint">
            Zalijepi JSON sa službenih rezultata i uporedi sa utakmicama u
            aplikaciji za trenutno odabranu sezonu
          </p>
        </div>
        <div className="section-body">
          <p className="compare-hint muted">
            Ista utakmica se traži po <strong>kolu</strong> i imenima domaćina i
            gosta (bez obzira na velika/mala slova i dijakritike). Ako sa npr.
            livesporta kopiraš drugačiji oblik, prilagodi polja{' '}
            <code>kolo</code>, <code>domacin</code>, <code>gost</code> i bodove
            (<code>domacin_golovi</code> / <code>gost_golovi</code> ili{' '}
            <code>rez</code>: &quot;2:1&quot;).
          </p>
          <textarea
            className="compare-textarea"
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
            placeholder="JSON niz rezultata…"
            aria-label="JSON referenca"
            disabled={detailLoading}
          />
          <div className="compare-actions">
            <button type="button" onClick={runCompare} disabled={detailLoading}>
              Uporedi
            </button>
            <button
              type="button"
              onClick={() => setRawJson(exampleJson)}
              disabled={detailLoading}
            >
              Ubaci primjer
            </button>
          </div>
          {parseErr && (
            <div className="error error-banner" role="alert">
              {parseErr}
            </div>
          )}
          {compared && compared.length === 0 && (
            <p className="muted">Nema redova za prikaz.</p>
          )}
          {compared && compared.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="numeric">Kolo</th>
                    <th>Domaćin</th>
                    <th>Gost</th>
                    <th>Referenca</th>
                    <th>Aplikacija</th>
                    <th>Napomena</th>
                  </tr>
                </thead>
                <tbody>
                  {compared.map((row, idx) => {
                    if (row.kind === 'pair') {
                      const cls = row.status === 'ok' ? 'row-ok' : 'row-diff'
                      const note =
                        row.status === 'ok'
                          ? 'Poklapanje'
                          : 'Drugačiji rezultat ili utakmica bez rezultata u aplikaciji'
                      return (
                        <tr key={`p-${idx}`} className={cls}>
                          <td className="numeric">{row.round}</td>
                          <td>{row.homeApp}</td>
                          <td>{row.awayApp}</td>
                          <td className="numeric">{row.refScore}</td>
                          <td className="numeric">{row.appScore}</td>
                          <td>{note}</td>
                        </tr>
                      )
                    }
                    if (row.kind === 'ref_only') {
                      return (
                        <tr key={`r-${idx}`} className="row-missing">
                          <td className="numeric">{row.ref.round}</td>
                          <td>{row.ref.home}</td>
                          <td>{row.ref.away}</td>
                          <td className="numeric">
                            {row.ref.homeGoals}:{row.ref.awayGoals}
                          </td>
                          <td>—</td>
                          <td>Nema u aplikaciji (ime/kolo?)</td>
                        </tr>
                      )
                    }
                    return (
                      <tr key={`a-${idx}`} className="row-missing">
                        <td className="numeric">{row.m.round_no}</td>
                        <td>{row.homeApp}</td>
                        <td>{row.awayApp}</td>
                        <td>—</td>
                        <td className="numeric">
                          {row.m.home_goals ?? '—'}:{row.m.away_goals ?? '—'}
                        </td>
                        <td>Nema u zalijepljenoj referenci</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
