import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import type { PlayerRow } from '../api/players'
import { getPlayers } from '../api/players'
import type { TeamRow } from '../api/teams'
import { getTeam } from '../api/teams'
import { PlayerProfileLink } from '../components/PlayerProfileLink'
import { useLigaData } from '../context/LigaDataContext'

export function TimDetaljPage() {
  const { teamId: teamIdParam } = useParams()
  const teamId = Number(teamIdParam)
  const { selectedSeasonId } = useLigaData()

  const [team, setTeam] = useState<TeamRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [squad, setSquad] = useState<PlayerRow[]>([])
  const [squadLoading, setSquadLoading] = useState(false)
  const [squadError, setSquadError] = useState<string | null>(null)

  useEffect(() => {
    if (!Number.isFinite(teamId) || teamId < 1) {
      setTeam(null)
      setError('Neispravan ID kluba u adresi.')
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    getTeam(teamId)
      .then((row) => {
        if (!cancelled) {
          setTeam(row)
          setError(null)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setTeam(null)
          const msg =
            e instanceof Error ? e.message : 'Klub nije učitan.'
          setError(msg)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [teamId])

  useEffect(() => {
    if (!Number.isFinite(teamId) || teamId < 1) {
      setSquad([])
      return
    }

    let cancelled = false
    setSquadLoading(true)
    setSquadError(null)

    const params =
      selectedSeasonId != null
        ? { season_id: selectedSeasonId, team_id: teamId }
        : { team_id: teamId }

    getPlayers(params)
      .then((rows) => {
        if (!cancelled) {
          const sorted = [...rows].sort(
            (a, b) =>
              (a.shirt_number ?? 999) - (b.shirt_number ?? 999) ||
              a.full_name.localeCompare(b.full_name, 'bs'),
          )
          setSquad(sorted)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setSquad([])
          setSquadError(
            e instanceof Error ? e.message : 'Kadar nije učitan.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setSquadLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [teamId, selectedSeasonId])

  return (
    <section className="tim-detalj-block" aria-label="Profil kluba">
      <div className="section-card">
        <div className="tim-detalj-head">
          <Link to="/timovi" className="back-to-list">
            ← Svi klubovi
          </Link>
          {loading && <p className="muted">Učitavanje…</p>}
          {!loading && error && (
            <div className="error error-banner" role="alert">
              {error}
            </div>
          )}
          {!loading && !error && team && (
            <>
              <h1 className="tim-detalj-title">{team.name}</h1>
              <p className="section-hint">Profil kluba u aplikaciji</p>
            </>
          )}
        </div>
        {!loading && !error && team && (
          <div className="section-body tim-detalj-body">
            <dl className="tim-detalj-facts">
              <div>
                <dt>Grad</dt>
                <dd>{team.city ?? '—'}</dd>
              </div>
              <div>
                <dt>Stadion</dt>
                <dd>{team.stadium ?? '—'}</dd>
              </div>
              <div>
                <dt>Trener</dt>
                <dd>{team.coach ?? '—'}</dd>
              </div>
              <div>
                <dt>ID u bazi</dt>
                <dd className="numeric muted">{team.id}</dd>
              </div>
            </dl>

            <div className="tim-detalj-squad">
              <h2 className="tim-detalj-squad-title">Kadar</h2>
              <p className="section-hint tim-detalj-squad-hint">
                {selectedSeasonId != null
                  ? 'Igrači za odabranu sezonu u toolbaru'
                  : 'Svi zapisi za ovaj klub (odaberi sezonu za filtriranje)'}
              </p>
              {squadLoading && <p className="muted">Učitavanje kadra…</p>}
              {squadError && (
                <div className="error error-banner" role="alert">
                  {squadError}
                </div>
              )}
              {!squadLoading && !squadError && squad.length === 0 && (
                <p className="muted">Nema igrača za ovaj klub u podacima.</p>
              )}
              {!squadLoading && squad.length > 0 && (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="numeric">Bd.</th>
                        <th className="team-col">Igrač</th>
                        <th>Poz.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {squad.map((p) => (
                        <tr key={p.id}>
                          <td className="numeric">
                            {p.shirt_number ?? '—'}
                          </td>
                          <td className="team-strong">
                            <PlayerProfileLink playerId={p.id}>
                              {p.full_name}
                            </PlayerProfileLink>
                          </td>
                          <td className="muted">{p.position ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
