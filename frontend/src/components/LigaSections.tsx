import { useEffect, useMemo, useState } from 'react'

import { useLigaData } from '../context/LigaDataContext'
import { REGULATION_MINUTES, MATCHDAY_SQUAD_PLAYERS } from '../domain/football'
import type { MatchRefereeRow } from '../api/match-referees'
import {
  matchRefereeRoleLabelBs,
  sortMatchRefereesForDisplay,
} from '../api/match-referees'
import { formatDate } from '../utils/formatDate'
import { sortMatchesForDisplay } from '../utils/sortMatches'

import { PlayerProfileLink } from './PlayerProfileLink'
import { TeamClubLink } from './TeamClubLink'

function MatchRefereesCell({
  matchId,
  crewByMatch,
}: {
  matchId: number
  crewByMatch: Map<number, MatchRefereeRow[]>
}) {
  const rows = crewByMatch.get(matchId)
  if (!rows?.length) {
    return (
      <td className="muted ref-crew-cell">
        <span title="Nema podataka o sudijama (stara baza ili prazno)">—</span>
      </td>
    )
  }
  const sorted = sortMatchRefereesForDisplay(rows)
  return (
    <td className="ref-crew-cell">
      <ul className="ref-crew-list">
        {sorted.map((r) => (
          <li key={r.role}>
            <span className="muted">{matchRefereeRoleLabelBs(r.role)}:</span>{' '}
            {r.referee_full_name}
          </li>
        ))}
      </ul>
    </td>
  )
}

export function StandingsSection() {
  const { selectedSeasonId, standings, detailLoading } = useLigaData()

  if (selectedSeasonId == null) return null

  return (
    <section className="standings-block" aria-label="Tablica bodova">
      <div className="section-card">
        <div className="section-head">
          <h2>Tablica</h2>
          <p className="section-hint">
            Bodovi po pravilu 3-1-0 (samo odigrane utakmice s rezultatom).
          </p>
        </div>
        <div className="section-body">
          {standings.length === 0 && !detailLoading && (
            <div className="section-body-plain">
              <p className="muted">Nema podataka za rang listu.</p>
            </div>
          )}
          {standings.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="rank-col">#</th>
                    <th className="team-col">Klub</th>
                    <th className="numeric">Ut.</th>
                    <th className="numeric">P</th>
                    <th className="numeric">N</th>
                    <th className="numeric">Por</th>
                    <th className="numeric">Gr+</th>
                    <th className="numeric">Gr−</th>
                    <th className="numeric">Rg</th>
                    <th className="numeric">B</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row) => (
                    <tr key={row.team_id}>
                      <td className="rank-cell">{row.rank}</td>
                      <td className="team-strong">
                        <TeamClubLink teamId={row.team_id}>
                          {row.team_name}
                        </TeamClubLink>
                      </td>
                      <td className="numeric">{row.played}</td>
                      <td className="numeric">{row.won}</td>
                      <td className="numeric">{row.drawn}</td>
                      <td className="numeric">{row.lost}</td>
                      <td className="numeric">{row.goals_for}</td>
                      <td className="numeric">{row.goals_against}</td>
                      <td className="numeric">
                        {row.goal_difference > 0
                          ? `+${row.goal_difference}`
                          : row.goal_difference}
                      </td>
                      <td className="numeric points-cell">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export function TeamsSection() {
  const { teams } = useLigaData()

  if (teams.length === 0) return null

  return (
    <section className="teams-block" aria-label="Lista timova">
      <div className="section-card">
        <div className="section-head">
          <h2>Klubovi</h2>
          <p className="section-hint">Sudionici takmičenja</p>
        </div>
        <div className="section-body">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="numeric">ID</th>
                  <th className="team-col">Naziv</th>
                  <th>Grad</th>
                  <th>Stadion</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((row) => (
                  <tr key={row.id}>
                    <td className="numeric muted">{row.id}</td>
                    <td className="team-strong">
                      <TeamClubLink teamId={row.id}>{row.name}</TeamClubLink>
                    </td>
                    <td>{row.city ?? '—'}</td>
                    <td className="muted">{row.stadium ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}

export function MatchesSection() {
  const {
    selectedSeasonId,
    matches,
    detailLoading,
    resolveTeam,
    seasons,
    matchRefAssignments,
  } = useLigaData()

  const [roundFilter, setRoundFilter] = useState<number | 'sva'>('sva')

  useEffect(() => {
    setRoundFilter('sva')
  }, [selectedSeasonId])

  const sorted = useMemo(() => sortMatchesForDisplay(matches), [matches])

  const roundNumbers = useMemo(() => {
    const s = new Set<number>()
    for (const m of sorted) {
      if (m.round_no != null) s.add(m.round_no)
    }
    return [...s].sort((a, b) => a - b)
  }, [sorted])

  const scheduleSummary = useMemo(() => {
    if (sorted.length === 0 || roundNumbers.length === 0) return null
    const lastR = roundNumbers[roundNumbers.length - 1]!
    const inLast = sorted.filter((m) => m.round_no === lastR)
    let lastDate = ''
    for (const m of inLast) {
      if (!lastDate || m.match_date > lastDate) lastDate = m.match_date
    }
    const seasonRow = seasons.find((s) => s.id === selectedSeasonId)
    return {
      lastR,
      lastDate,
      seasonEnd: seasonRow?.end_date ?? null,
    }
  }, [sorted, roundNumbers, seasons, selectedSeasonId])

  const crewByMatch = useMemo(() => {
    const map = new Map<number, MatchRefereeRow[]>()
    for (const a of matchRefAssignments) {
      const list = map.get(a.match_id) ?? []
      list.push(a)
      map.set(a.match_id, list)
    }
    return map
  }, [matchRefAssignments])

  if (selectedSeasonId == null) return null

  const visible =
    roundFilter === 'sva'
      ? sorted
      : sorted.filter((m) => m.round_no === roundFilter)

  return (
    <section className="matches-block" aria-label="Utakmice">
      <div className="section-card">
        <div className="section-head">
          <h2>Okršaji po kolima</h2>
          <p className="section-hint">
            Odaberi kolo ili prikaži sva — redosled: kolo, datum.
            {scheduleSummary && (
              <>
                {' '}
                Raspored u podacima: kola 1–{scheduleSummary.lastR}, zadnje kolo{' '}
                {formatDate(scheduleSummary.lastDate)}
                {scheduleSummary.seasonEnd
                  ? `; kraj sezone u kalendaru: ${formatDate(scheduleSummary.seasonEnd)}`
                  : ''}
                .
              </>
            )}
          </p>
        </div>
        {sorted.length > 0 && (
          <div className="match-toolbar">
            <label htmlFor="round-filter">Kolo</label>
            <div className="match-picker">
              <select
                id="round-filter"
                value={roundFilter === 'sva' ? 'sva' : String(roundFilter)}
                onChange={(e) => {
                  const v = e.target.value
                  setRoundFilter(v === 'sva' ? 'sva' : Number(v))
                }}
                disabled={detailLoading}
              >
                <option value="sva">Sva kola ({sorted.length} utakmica)</option>
                {roundNumbers.map((r) => {
                  const n = sorted.filter((m) => m.round_no === r).length
                  return (
                    <option key={r} value={r}>
                      Kolo {r} ({n})
                    </option>
                  )
                })}
              </select>
            </div>
          </div>
        )}
        <div className="section-body">
          {matches.length === 0 && !detailLoading && (
            <div className="section-body-plain">
              <p className="muted">Nema zakazanih ili odigranih utakmica.</p>
            </div>
          )}
          {matches.length > 0 && visible.length === 0 && (
            <div className="section-body-plain">
              <p className="muted">Nema utakmica za ovo kolo u podacima.</p>
            </div>
          )}
          {visible.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="numeric">Kr.</th>
                    <th>Datum</th>
                    <th className="team-col">Domaćin</th>
                    <th className="numeric">Rez.</th>
                    <th className="team-col">Gost</th>
                    <th>Status</th>
                    <th>Sudije</th>
                  </tr>
                </thead>
                <tbody>
                  {roundFilter === 'sva'
                    ? roundNumbers.flatMap((r) => {
                        const inRound = sorted.filter((m) => m.round_no === r)
                        return [
                          <tr key={`hdr-${r}`} className="round-header-row">
                            <td colSpan={7}>Kolo {r}</td>
                          </tr>,
                          ...inRound.map((m) => (
                            <tr key={m.id}>
                              <td className="numeric">{m.round_no}</td>
                              <td className="muted">
                                {formatDate(m.match_date)}
                              </td>
                              <td>
                                <TeamClubLink teamId={m.home_team_id}>
                                  {resolveTeam(m.home_team_id)}
                                </TeamClubLink>
                              </td>
                              <td className="score-cell">
                                <span className="score-pair">
                                  {m.home_goals ?? '—'} :{' '}
                                  {m.away_goals ?? '—'}
                                </span>
                              </td>
                              <td>
                                <TeamClubLink teamId={m.away_team_id}>
                                  {resolveTeam(m.away_team_id)}
                                </TeamClubLink>
                              </td>
                              <td>
                                <span className="status-chip">{m.status}</span>
                              </td>
                              <MatchRefereesCell
                                matchId={m.id}
                                crewByMatch={crewByMatch}
                              />
                            </tr>
                          )),
                        ]
                      })
                    : visible.map((m) => (
                        <tr key={m.id}>
                          <td className="numeric">{m.round_no}</td>
                          <td className="muted">{formatDate(m.match_date)}</td>
                          <td>
                            <TeamClubLink teamId={m.home_team_id}>
                              {resolveTeam(m.home_team_id)}
                            </TeamClubLink>
                          </td>
                          <td className="score-cell">
                            <span className="score-pair">
                              {m.home_goals ?? '—'} : {m.away_goals ?? '—'}
                            </span>
                          </td>
                          <td>
                            <TeamClubLink teamId={m.away_team_id}>
                              {resolveTeam(m.away_team_id)}
                            </TeamClubLink>
                          </td>
                          <td>
                            <span className="status-chip">{m.status}</span>
                          </td>
                          <MatchRefereesCell
                            matchId={m.id}
                            crewByMatch={crewByMatch}
                          />
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export function PlayersSection() {
  const { selectedSeasonId, players, resolveTeam } = useLigaData()

  if (selectedSeasonId == null || players.length === 0) return null

  return (
    <section className="players-block" aria-label="Igrači sezone">
      <div className="section-card">
        <div className="section-head">
          <h2>Igrači</h2>
          <p className="section-hint">
            {MATCHDAY_SQUAD_PLAYERS} igrača po klubu (11 na terenu + 5 mjesta zamjene
            u kadru) — odabrana sezona
          </p>
        </div>
        <div className="section-body">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th className="team-col">Igrač</th>
                  <th className="numeric">Bd.</th>
                  <th>Poz.</th>
                  <th className="team-col">Klub</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id}>
                    <td className="numeric muted">{p.id}</td>
                    <td className="team-strong">
                      <PlayerProfileLink playerId={p.id}>
                        {p.full_name}
                      </PlayerProfileLink>
                    </td>
                    <td className="numeric">{p.shirt_number ?? '—'}</td>
                    <td className="muted">{p.position ?? '—'}</td>
                    <td>
                      <TeamClubLink teamId={p.team_id}>
                        {resolveTeam(p.team_id)}
                      </TeamClubLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}

export function MatchEventsSection() {
  const {
    selectedSeasonId,
    matches,
    selectedMatchId,
    matchEvents,
    detailLoading,
    resolveTeam,
    playerNameById,
    onMatchChange,
    selectedMatchLabel,
    matchRefAssignments,
  } = useLigaData()

  const crewForSelected = useMemo(() => {
    if (selectedMatchId == null) return []
    return sortMatchRefereesForDisplay(
      matchRefAssignments.filter((a) => a.match_id === selectedMatchId),
    )
  }, [matchRefAssignments, selectedMatchId])

  if (selectedSeasonId == null || matches.length === 0) return null

  return (
    <section className="events-block" aria-label="Događaji na utakmici">
      <div className="section-card">
        <div className="section-head">
          <h2>Događaji</h2>
          <p className="section-hint">
            Regularno vrijeme 1–{REGULATION_MINUTES} min (golovi, kartoni…); +n =
            nadoknada u poluvremenu
          </p>
        </div>
        <div className="match-toolbar">
          <label htmlFor="match-select">Meč:</label>
          <div className="match-picker">
            <select
              id="match-select"
              value={selectedMatchId ?? ''}
              onChange={onMatchChange}
              disabled={detailLoading}
            >
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {selectedMatchLabel(m)}
                </option>
              ))}
            </select>
          </div>
        </div>
        {crewForSelected.length > 0 && (
          <div className="match-ref-panel section-body-plain">
            <h3 className="match-ref-heading">Sudije</h3>
            <dl className="match-ref-dl">
              {crewForSelected.map((r) => (
                <div key={r.role}>
                  <dt>{matchRefereeRoleLabelBs(r.role)}</dt>
                  <dd>{r.referee_full_name}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        <div className="section-body">
          {matchEvents.length === 0 && !detailLoading && (
            <div className="section-body-plain">
              <p className="muted">
                Za ovaj meč još nisu unijeti događaji u rezultatu.
              </p>
            </div>
          )}
          {matchEvents.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="numeric">Min</th>
                    <th>Tip</th>
                    <th>Tim</th>
                    <th>Igrač</th>
                    <th>Napomena</th>
                  </tr>
                </thead>
                <tbody>
                  {matchEvents.map((ev) => (
                    <tr key={ev.id}>
                      <td className="numeric">
                        {ev.minute}
                        {ev.minute_added != null ? `+${ev.minute_added}` : ''}
                      </td>
                      <td>
                        <span className="status-chip">{ev.event_type}</span>
                      </td>
                      <td>
                        <TeamClubLink teamId={ev.team_id}>
                          {resolveTeam(ev.team_id)}
                        </TeamClubLink>
                      </td>
                      <td>
                        {ev.player_id != null ? (
                          <PlayerProfileLink playerId={ev.player_id}>
                            {playerNameById.get(ev.player_id) ??
                              `#${ev.player_id}`}
                          </PlayerProfileLink>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="muted">{ev.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
