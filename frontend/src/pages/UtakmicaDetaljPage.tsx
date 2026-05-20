import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import {
  matchRefereeRoleLabelBs,
  sortMatchRefereesForDisplay,
} from '../api/match-referees'
import { teamInitial } from '../components/LigaSections'
import { MatchEventTimeline } from '../components/MatchEventTimeline'
import { MatchEventsForm } from '../components/MatchEventsForm'
import { TeamClubLink } from '../components/TeamClubLink'
import { useLigaData } from '../context/LigaDataContext'
import { formatMatchDateTime } from '../utils/formatDate'

export function UtakmicaDetaljPage() {
  const { matchId: matchIdParam } = useParams()
  const matchId = Number(matchIdParam)
  const [tab, setTab] = useState<'pregled' | 'dogadjaji'>('pregled')

  const {
    matches,
    loading,
    detailLoading,
    resolveTeam,
    playerNameById,
    matchRefAssignments,
    selectMatchById,
    refreshSeasonData,
    players,
    matchEvents,
    seasons,
    selectedSeasonId,
  } = useLigaData()

  useEffect(() => {
    if (!Number.isFinite(matchId) || matchId < 1) return
    void selectMatchById(matchId)
  }, [matchId, selectMatchById])

  const m = matches.find((x) => x.id === matchId)

  const crewForMatch = useMemo(
    () =>
      sortMatchRefereesForDisplay(
        matchRefAssignments.filter((a) => a.match_id === matchId),
      ),
    [matchRefAssignments, matchId],
  )

  const seasonName = useMemo(() => {
    if (selectedSeasonId == null) return null
    return seasons.find((s) => s.id === selectedSeasonId)?.name ?? null
  }, [seasons, selectedSeasonId])

  if (!Number.isFinite(matchId) || matchId < 1) {
    return (
      <p className="muted">
        Neispravan link utakmice. <Link to="/rezultati">← Rezultati</Link>
      </p>
    )
  }

  if (loading) {
    return <p className="muted">Učitavanje…</p>
  }

  if (!m) {
    return (
      <div className="section-card">
        <p className="muted">
          Ova utakmica nije u trenutno učitanoj sezoni. Odaberi odgovarajuću
          sezonu u traci ili idi na{' '}
          <Link to="/rezultati">listu rezultata</Link>.
        </p>
      </div>
    )
  }

  const homeName = resolveTeam(m.home_team_id)
  const awayName = resolveTeam(m.away_team_id)
  const scheduled = m.status === 'scheduled'
  const scoreH = scheduled ? '—' : (m.home_goals ?? '—')
  const scoreA = scheduled ? '—' : (m.away_goals ?? '—')

  return (
    <section className="match-detail-page" aria-label="Detalj utakmice">
      <nav className="match-detail-breadcrumb muted" aria-label="Navigacija">
        <Link to="/">Pregled</Link>
        <span aria-hidden> / </span>
        <Link to="/rezultati">Rezultati</Link>
        <span aria-hidden> / </span>
        <span>
          {homeName} — {awayName}
        </span>
      </nav>

      <div className="section-card match-detail-card">
        <header className="match-detail-hero">
          <div className="match-detail-team match-detail-team--home">
            <Link
              to={`/timovi/${m.home_team_id}`}
              className="match-detail-badge"
              aria-label={`Stranica kluba ${homeName}`}
            >
              {teamInitial(homeName)}
            </Link>
            <TeamClubLink
              teamId={m.home_team_id}
              className="match-detail-club-name"
            >
              {homeName}
            </TeamClubLink>
          </div>
          <div className="match-detail-center">
            {seasonName && (
              <p className="match-detail-season muted">{seasonName}</p>
            )}
            <p className="match-detail-round muted">Kolo {m.round_no}</p>
            <time className="match-detail-when" dateTime={m.match_date}>
              {formatMatchDateTime(m.match_date, m.kickoff_at)}
            </time>
            <p className="match-detail-score" aria-live="polite">
              <span>{scoreH}</span>
              <span className="match-detail-score-sep">:</span>
              <span>{scoreA}</span>
            </p>
            <span className="status-chip">{m.status}</span>
          </div>
          <div className="match-detail-team match-detail-team--away">
            <Link
              to={`/timovi/${m.away_team_id}`}
              className="match-detail-badge"
              aria-label={`Stranica kluba ${awayName}`}
            >
              {teamInitial(awayName)}
            </Link>
            <TeamClubLink
              teamId={m.away_team_id}
              className="match-detail-club-name"
            >
              {awayName}
            </TeamClubLink>
          </div>
        </header>

        <div className="match-detail-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'pregled'}
            className={
              tab === 'pregled'
                ? 'match-detail-tab match-detail-tab--active'
                : 'match-detail-tab'
            }
            onClick={() => setTab('pregled')}
          >
            Pregled
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'dogadjaji'}
            className={
              tab === 'dogadjaji'
                ? 'match-detail-tab match-detail-tab--active'
                : 'match-detail-tab'
            }
            onClick={() => setTab('dogadjaji')}
          >
            Događaji
          </button>
        </div>

        {tab === 'pregled' && (
          <div className="section-body match-detail-tab-panel">
            <MatchEventTimeline
              match={m}
              events={matchEvents}
              playerNameById={playerNameById}
            />
            {crewForMatch.length > 0 ? (
              <div className="match-ref-panel section-body-plain">
                <h3 className="match-ref-heading">Sudije</h3>
                <dl className="match-ref-dl">
                  {crewForMatch.map((r) => (
                    <div key={r.role}>
                      <dt>{matchRefereeRoleLabelBs(r.role)}</dt>
                      <dd>{r.referee_full_name}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : (
              <p className="muted">Nema podataka o sudijama za ovaj meč.</p>
            )}
            {m.notes ? (
              <p className="match-detail-notes">
                <strong>Napomena:</strong> {m.notes}
              </p>
            ) : null}
          </div>
        )}

        {tab === 'dogadjaji' && (
          <div className="section-body match-detail-tab-panel">
            <MatchEventsForm
              match={m}
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
