import { useLigaData } from '../context/LigaDataContext'
import { formatDate } from '../utils/formatDate'

export function TeamsSection() {
  const { teams } = useLigaData()

  if (teams.length === 0) return null

  return (
    <section className="teams-block" aria-label="Lista timova">
      <h2>Timovi</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Naziv</th>
              <th>Grad</th>
              <th>Stadion</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.name}</td>
                <td>{row.city ?? '—'}</td>
                <td>{row.stadium ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
  } = useLigaData()

  if (selectedSeasonId == null) return null

  return (
    <section className="matches-block" aria-label="Utakmice">
      <h2>Utakmice</h2>
      {matches.length === 0 && !detailLoading && (
        <p className="muted">Nema utakmica za ovu sezonu.</p>
      )}
      {matches.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Kolo</th>
                <th>Datum</th>
                <th>Domaćin</th>
                <th>Rezultat</th>
                <th>Gost</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr key={m.id}>
                  <td>{m.round_no}</td>
                  <td>{formatDate(m.match_date)}</td>
                  <td>{resolveTeam(m.home_team_id)}</td>
                  <td className="score-cell">
                    {m.home_goals ?? '—'} : {m.away_goals ?? '—'}
                  </td>
                  <td>{resolveTeam(m.away_team_id)}</td>
                  <td>{m.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export function PlayersSection() {
  const { selectedSeasonId, players, resolveTeam } = useLigaData()

  if (selectedSeasonId == null || players.length === 0) return null

  return (
    <section className="players-block" aria-label="Igrači sezone">
      <h2>Igrači (odabrana sezona)</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Igrač</th>
              <th>Broj</th>
              <th>Pozicija</th>
              <th>Tim</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id}>
                <td>{p.full_name}</td>
                <td>{p.shirt_number ?? '—'}</td>
                <td>{p.position ?? '—'}</td>
                <td>{resolveTeam(p.team_id)}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
  } = useLigaData()

  if (selectedSeasonId == null || matches.length === 0) return null

  return (
    <section className="events-block" aria-label="Događaji na utakmici">
      <h2>Događaji na utakmici</h2>
      <div className="match-picker">
        <label htmlFor="match-select">Utakmica</label>
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

      {matchEvents.length === 0 && !detailLoading && (
        <p className="muted">Nema unešenih događaja za ovu utakmicu.</p>
      )}
      {matchEvents.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Min</th>
                <th>Tip</th>
                <th>Tim</th>
                <th>Igrač</th>
                <th>Napomena</th>
              </tr>
            </thead>
            <tbody>
              {matchEvents.map((ev) => (
                <tr key={ev.id}>
                  <td>
                    {ev.minute}
                    {ev.minute_added != null ? `+${ev.minute_added}` : ''}
                  </td>
                  <td>{ev.event_type}</td>
                  <td>{resolveTeam(ev.team_id)}</td>
                  <td>
                    {ev.player_id != null
                      ? (playerNameById.get(ev.player_id) ?? `#${ev.player_id}`)
                      : '—'}
                  </td>
                  <td>{ev.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
