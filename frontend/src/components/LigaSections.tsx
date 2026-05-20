import { useEffect, useMemo, useState } from 'react'

import { Link, useNavigate } from 'react-router-dom'

import { useLigaData } from '../context/LigaDataContext'
import { REGULATION_MINUTES, MATCHDAY_SQUAD_PLAYERS } from '../domain/football'
import type { MatchRow } from '../api/matches'
import {
  matchRefereeRoleLabelBs,
  sortMatchRefereesForDisplay,
} from '../api/match-referees'
import { formatDate, formatDateWeekdayLong, formatMatchDateTime } from '../utils/formatDate'
import {
  groupMatchesByDate,
  matchCountLabelBs,
} from '../utils/matchCalendar'
import { sortMatchesForDisplay } from '../utils/sortMatches'

import { PlayerProfileLink } from './PlayerProfileLink'
import { MatchEventsForm } from './MatchEventsForm'
import { RoundsLoadMore } from './RoundsLoadMore'
import { TeamClubLink } from './TeamClubLink'
import { useProgressiveRounds } from '../hooks/useProgressiveRounds'

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

export function teamInitial(teamName: string): string {
  const t = teamName.trim()
  if (!t) return '?'
  return t.charAt(0).toLocaleUpperCase('bs-BA')
}

export function MatchResultFlashRow({
  m,
  resolveTeam,
  embedTeamLinks = false,
}: {
  m: MatchRow
  resolveTeam: (id: number) => string
  /**
   * true samo na stranici detalja utakmice — imena klubova su zasebni linkovi.
   * U listama (raspored, rezultati) cijeli red vodi na detalj; klubovi nisu klikabilni.
   */
  embedTeamLinks?: boolean
}) {
  const homeName = resolveTeam(m.home_team_id)
  const awayName = resolveTeam(m.away_team_id)
  const scheduled = m.status === 'scheduled'
  const scoreH = scheduled ? '—' : (m.home_goals ?? '—')
  const scoreA = scheduled ? '—' : (m.away_goals ?? '—')

  const timeCol = (
    <div className="match-result-time-col">
      <time dateTime={m.match_date}>
        {formatMatchDateTime(m.match_date, m.kickoff_at)}
      </time>
    </div>
  )

  const homeNameEl = embedTeamLinks ? (
    <TeamClubLink teamId={m.home_team_id} className="match-result-team-name">
      {homeName}
    </TeamClubLink>
  ) : (
    <span className="match-result-team-name">{homeName}</span>
  )

  const awayNameEl = embedTeamLinks ? (
    <TeamClubLink teamId={m.away_team_id} className="match-result-team-name">
      {awayName}
    </TeamClubLink>
  ) : (
    <span className="match-result-team-name">{awayName}</span>
  )

  const body = (
    <div className="match-result-body">
      <div className="match-result-line">
        <span className="match-result-badge" aria-hidden>
          {teamInitial(homeName)}
        </span>
        {homeNameEl}
        <span className="match-result-goals">{scoreH}</span>
      </div>
      <div className="match-result-line">
        <span className="match-result-badge" aria-hidden>
          {teamInitial(awayName)}
        </span>
        {awayNameEl}
        <span className="match-result-goals">{scoreA}</span>
      </div>
      <div className="match-result-footer">
        <span className="status-chip">{m.status}</span>
      </div>
    </div>
  )

  if (embedTeamLinks) {
    return (
      <article className="match-result-row" role="listitem">
        {timeCol}
        {body}
      </article>
    )
  }

  return (
    <Link
      to={`/utakmice/${m.id}`}
      className="match-result-row match-result-row--link"
      role="listitem"
      title="Klikni za detalje utakmice"
    >
      {timeCol}
      {body}
    </Link>
  )
}

/** Kratki kalendarski raspored za početnu (pregled) — isti prikaz redova kao na stranici Raspored. */
export function RasporedPreviewSection() {
  const {
    selectedSeasonId,
    matches,
    detailLoading,
    resolveTeam,
  } = useLigaData()

  const sortedPreview = useMemo(() => sortMatchesForDisplay(matches), [matches])

  const previewProgressive = useProgressiveRounds(sortedPreview, {
    resetKey: selectedSeasonId,
    enabled: true,
  })

  const byDate = useMemo(
    () => groupMatchesByDate(previewProgressive.displayedMatches),
    [previewProgressive.displayedMatches],
  )

  if (selectedSeasonId == null) return null

  return (
    <section className="raspored-preview-block" aria-label="Raspored">
      <div className="section-card">
        <div className="section-head">
          <h2>Raspored</h2>
          <p className="section-hint">
            Termini po kolima za odabranu sezonu (datum je uz svako kolo ispod naslova). Prikazuje se prvo{' '}
            <strong>jedno kolo</strong>; sljedeća kola dodaješ dugmetom „Prikaži još” (a „Prikaži manje”
            vraća prethodni korak). Klik bilo gdje na redu otvara detalj te utakmice.
            {detailLoading && (
              <>
                {' '}
                <span className="muted">Osvježavanje…</span>
              </>
            )}
          </p>
        </div>
        <div className="section-body">
          {matches.length === 0 && !detailLoading && (
            <div className="section-body-plain">
              <p className="muted">Nema utakmica u rasporedu.</p>
            </div>
          )}
          {byDate.map(({ date, rounds, matches: dayMatches }) => {
            const roundLabel =
              rounds.size === 0
                ? `Termin ${formatDate(date)}`
                : rounds.size === 1
                  ? `Kolo ${[...rounds][0]}`
                  : `Kola ${[...rounds].sort((a, b) => a - b).join(', ')}`
            const dateMeta = `${formatDateWeekdayLong(date)} (${formatDate(date)})`
            return (
              <div key={date} className="raspored-day-block">
                <h3 className="raspored-day-head">
                  <span className="raspored-day-title">{roundLabel}</span>
                  <span className="raspored-day-meta muted">
                    {dateMeta} · {matchCountLabelBs(dayMatches.length)}
                  </span>
                </h3>
                <div
                  className="match-results-board raspored-day-matches"
                  role="list"
                >
                  {dayMatches.map((m) => (
                    <MatchResultFlashRow
                      key={m.id}
                      m={m}
                      resolveTeam={resolveTeam}
                    />
                  ))}
                </div>
              </div>
            )
          })}
          {matches.length > 0 &&
            (previewProgressive.canShowMore || previewProgressive.canShowLess) && (
            <RoundsLoadMore
              canShowMore={previewProgressive.canShowMore}
              onShowMore={previewProgressive.showMore}
              nextChunkLabel={previewProgressive.nextChunkLabel}
              canShowLess={previewProgressive.canShowLess}
              onShowLess={previewProgressive.showLess}
              prevChunkLabel={previewProgressive.prevChunkLabel}
            />
          )}
        </div>
      </div>
    </section>
  )
}

export function MatchesSection({
  variant = 'table',
}: {
  variant?: 'table' | 'resultsBoard'
}) {
  const {
    selectedSeasonId,
    matches,
    detailLoading,
    resolveTeam,
    seasons,
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

  const listProgressive = useProgressiveRounds(sorted, {
    resetKey: selectedSeasonId,
    enabled: roundFilter === 'sva',
  })

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

  const navigate = useNavigate()

  const visible =
    selectedSeasonId == null
      ? []
      : roundFilter === 'sva'
        ? listProgressive.displayedMatches
        : sorted.filter((m) => m.round_no === roundFilter)

  const roundNumbersVisible = useMemo(() => {
    const s = new Set<number>()
    for (const m of visible) {
      if (m.round_no != null) s.add(m.round_no)
    }
    return [...s].sort((a, b) => a - b)
  }, [visible])

  if (selectedSeasonId == null) return null

  return (
    <section className="matches-block" aria-label="Utakmice">
      <div className="section-card">
        <div className="section-head">
          <h2>{variant === 'resultsBoard' ? 'Rezultati' : 'Zadnji rezultati'}</h2>
          <p className="section-hint">
            {variant === 'resultsBoard' ? (
              <>
                Klubovi jedan ispod drugog; lijevo datum i vrijeme, pored svakog kluba broj
                golova. Uz „Sva kola”: prvo jedno kolo, zatim „Prikaži još” za sljedeće. Cijeli
                red vodi na detalj utakmice (klubovi u ovom prikazu nisu zasebni linkovi).
                {scheduleSummary && (
                  <>
                    {' '}
                    U podacima: kola 1–{scheduleSummary.lastR}, zadnje kolo{' '}
                    {formatDate(scheduleSummary.lastDate)}
                    {scheduleSummary.seasonEnd
                      ? `; kraj sezone: ${formatDate(scheduleSummary.seasonEnd)}`
                      : ''}
                    .
                  </>
                )}
              </>
            ) : (
              <>
                Odaberi kolo ili prikaži sva — redosled: kolo, datum. Uz „Sva kola”: prvo jedno
                kolo, zatim „Prikaži još” za sljedeće. Klik na red tabele otvara detalj
                utakmice (u listi ispod klubovi nisu zasebni linkovi).
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
          {visible.length > 0 && variant === 'resultsBoard' && (
            <div className="match-results-board" role="list">
              {roundFilter === 'sva'
                ? roundNumbersVisible.flatMap((r) => {
                    const inRound = visible.filter((m) => m.round_no === r)
                    return [
                      <div key={`hdr-${r}`} className="results-round-header">
                        Kolo {r}
                      </div>,
                      ...inRound.map((m) => (
                        <MatchResultFlashRow
                          key={m.id}
                          m={m}
                          resolveTeam={resolveTeam}
                        />
                      )),
                    ]
                  })
                : visible.map((m) => (
                    <MatchResultFlashRow
                      key={m.id}
                      m={m}
                      resolveTeam={resolveTeam}
                    />
                  ))}
            </div>
          )}
          {visible.length > 0 && variant === 'table' && (
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
                  </tr>
                </thead>
                <tbody>
                  {roundFilter === 'sva'
                    ? roundNumbersVisible.flatMap((r) => {
                        const inRound = visible.filter((m) => m.round_no === r)
                        return [
                          <tr key={`hdr-${r}`} className="round-header-row">
                            <td colSpan={6}>Kolo {r}</td>
                          </tr>,
                          ...inRound.map((m) => (
                            <tr
                              key={m.id}
                              className="data-table-row--clickable"
                              onClick={() => navigate(`/utakmice/${m.id}`)}
                              title="Klikni za detalje utakmice"
                            >
                              <td className="numeric">{m.round_no}</td>
                              <td className="muted">
                                {formatDate(m.match_date)}
                              </td>
                              <td>
                                <span className="team-strong">
                                  {resolveTeam(m.home_team_id)}
                                </span>
                              </td>
                              <td className="score-cell">
                                <span className="score-pair">
                                  {m.home_goals ?? '—'} :{' '}
                                  {m.away_goals ?? '—'}
                                </span>
                              </td>
                              <td>
                                <span className="team-strong">
                                  {resolveTeam(m.away_team_id)}
                                </span>
                              </td>
                              <td>
                                <span className="status-chip">{m.status}</span>
                              </td>
                            </tr>
                          )),
                        ]
                      })
                    : visible.map((m) => (
                        <tr
                          key={m.id}
                          className="data-table-row--clickable"
                          onClick={() => navigate(`/utakmice/${m.id}`)}
                          title="Klikni za detalje utakmice"
                        >
                          <td className="numeric">{m.round_no}</td>
                          <td className="muted">{formatDate(m.match_date)}</td>
                          <td>
                            <span className="team-strong">
                              {resolveTeam(m.home_team_id)}
                            </span>
                          </td>
                          <td className="score-cell">
                            <span className="score-pair">
                              {m.home_goals ?? '—'} : {m.away_goals ?? '—'}
                            </span>
                          </td>
                          <td>
                            <span className="team-strong">
                              {resolveTeam(m.away_team_id)}
                            </span>
                          </td>
                          <td>
                            <span className="status-chip">{m.status}</span>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          )}
          {roundFilter === 'sva' &&
            sorted.length > 0 &&
            (listProgressive.canShowMore || listProgressive.canShowLess) && (
              <RoundsLoadMore
                canShowMore={listProgressive.canShowMore}
                onShowMore={listProgressive.showMore}
                nextChunkLabel={listProgressive.nextChunkLabel}
                canShowLess={listProgressive.canShowLess}
                onShowLess={listProgressive.showLess}
                prevChunkLabel={listProgressive.prevChunkLabel}
              />
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
    players,
    detailLoading,
    resolveTeam,
    playerNameById,
    onMatchChange,
    selectedMatchLabel,
    matchRefAssignments,
    refreshSeasonData,
  } = useLigaData()

  const crewForSelected = useMemo(() => {
    if (selectedMatchId == null) return []
    return sortMatchRefereesForDisplay(
      matchRefAssignments.filter((a) => a.match_id === selectedMatchId),
    )
  }, [matchRefAssignments, selectedMatchId])

  const selectedMatch = useMemo(
    () => matches.find((m) => m.id === selectedMatchId) ?? null,
    [matches, selectedMatchId],
  )

  if (selectedSeasonId == null || matches.length === 0) return null

  return (
    <section className="events-block" aria-label="Događaji na utakmici">
      <div className="section-card">
        <div className="section-head">
          <h2>Događaji</h2>
          <p className="section-hint">
            Gol, karton, zamjena (izlazi / ulazi), penal… — minut 1–
            {REGULATION_MINUTES}, +n je nadoknada. Tim mora biti domaćin ili gost;
            igrač mora biti iz kadra tog kluba u sezoni. Dodavanje, izmjena i brisanje
            snimaju se u bazu (ili mock ako nema DATABASE_URL). Rezultat na meču i tablica
            osvježavaju se iz golova u događajima. Tipka <strong>Sačuvaj</strong> šalje promjene;
            zakazan meč s izračunatim rezultatom automatski postaje završen radi bodova u tablici.
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
        {selectedMatch != null && (
          <div className="section-body">
            <MatchEventsForm
              match={selectedMatch}
              players={players}
              events={matchEvents}
              detailLoading={detailLoading}
              resolveTeam={resolveTeam}
              playerNameById={playerNameById}
              onRefresh={refreshSeasonData}
            />
          </div>
        )}
      </div>
    </section>
  )
}
