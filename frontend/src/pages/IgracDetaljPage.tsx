import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import type { PlayerRow } from '../api/players'
import { getPlayer } from '../api/players'
import { TeamClubLink } from '../components/TeamClubLink'
import { useLigaData } from '../context/LigaDataContext'

export function IgracDetaljPage() {
  const { playerId: playerIdParam } = useParams()
  const playerId = Number(playerIdParam)
  const { seasons, resolveTeam } = useLigaData()

  const [player, setPlayer] = useState<PlayerRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const seasonLabel = useMemo(() => {
    if (!player) return ''
    const s = seasons.find((x) => x.id === player.season_id)
    return s?.name ?? `Sezona #${player.season_id}`
  }, [player, seasons])

  useEffect(() => {
    if (!Number.isFinite(playerId) || playerId < 1) {
      setPlayer(null)
      setError('Neispravan ID igrača u adresi.')
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    getPlayer(playerId)
      .then((row) => {
        if (!cancelled) {
          setPlayer(row)
          setError(null)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setPlayer(null)
          const msg =
            e instanceof Error ? e.message : 'Igrač nije učitan.'
          setError(msg)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [playerId])

  return (
    <section className="igrac-detalj-block" aria-label="Profil igrača">
      <div className="section-card">
        <div className="tim-detalj-head">
          <Link to="/igraci" className="back-to-list">
            ← Svi igrači
          </Link>
          {loading && <p className="muted">Učitavanje…</p>}
          {!loading && error && (
            <div className="error error-banner" role="alert">
              {error}
            </div>
          )}
          {!loading && !error && player && (
            <>
              <h1 className="tim-detalj-title">{player.full_name}</h1>
              <p className="section-hint">
                {seasonLabel} · kadar u aplikaciji
              </p>
            </>
          )}
        </div>
        {!loading && !error && player && (
          <div className="section-body tim-detalj-body">
            <dl className="tim-detalj-facts">
              <div>
                <dt>Klub</dt>
                <dd>
                  <TeamClubLink teamId={player.team_id}>
                    {resolveTeam(player.team_id)}
                  </TeamClubLink>
                </dd>
              </div>
              <div>
                <dt>Broj dresa</dt>
                <dd className="numeric">
                  {player.shirt_number ?? '—'}
                </dd>
              </div>
              <div>
                <dt>Pozicija</dt>
                <dd>{player.position ?? '—'}</dd>
              </div>
              <div>
                <dt>ID u bazi</dt>
                <dd className="numeric muted">{player.id}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </section>
  )
}
