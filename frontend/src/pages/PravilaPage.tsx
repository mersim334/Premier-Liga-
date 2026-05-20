import { useEffect, useState } from 'react'

import { getRules, type RulesPayload } from '../api/rules'

export function PravilaPage() {
  const [rules, setRules] = useState<RulesPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setError(null)
    getRules()
      .then((r) => {
        if (!cancelled) setRules(r)
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setRules(null)
          setError(e instanceof Error ? e.message : 'Nije učitano.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="compare-block" aria-label="Pravila fudbala u aplikaciji">
      <div className="section-card">
        <div className="section-head">
          <h2>Pravila</h2>
          <p className="section-hint">
            Sažetak onoga što aplikacija tretira kao fudbalski pravilnik (IFAB + liga)
          </p>
        </div>
        <div className="section-body">
          {error && (
            <div className="error error-banner" role="alert">
              {error}
            </div>
          )}
          {!error && !rules && <p className="muted">Učitavanje…</p>}
          {rules && (
            <div className="rules-body">
              <section className="rules-section">
                <h3>Izvor</h3>
                <p className="compare-hint muted">{rules.rules_reference.note_bs}</p>
                <p>
                  <a
                    href={rules.rules_reference.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {rules.rules_reference.title}
                  </a>
                </p>
              </section>
              <section className="rules-section">
                <h3>Utakmica (regularno vrijeme)</h3>
                <ul className="rules-list muted">
                  <li>
                    Dva tima — domaćin i gost (u modelu moraju biti različiti
                    klubovi).
                  </li>
                  <li>
                    Na terenu: {rules.match_regulation.players_on_field_per_team}{' '}
                    igrača po strani.
                  </li>
                  <li>
                    Dva poluvremena po{' '}
                    {rules.match_regulation.half_duration_minutes} min (
                    {rules.match_regulation.regulation_minutes_total} min ukupno u
                    pravilniku).
                  </li>
                  <li>
                    Pauza između poluvremena: obično do{' '}
                    {rules.match_regulation.halftime_interval_max_minutes} min (tačno
                    određuje takmičenje).
                  </li>
                </ul>
              </section>
              <section className="rules-section">
                <h3>Zamjene</h3>
                <p className="muted">
                  Tipično do {rules.substitutions.typical_max_per_team} zamjena po timu
                  u mnogim senior takmičenjima (IFAB opcija).{' '}
                  {rules.substitutions.note_bs}
                </p>
              </section>
              <section className="rules-section">
                <h3>Kadar u bazi</h3>
                <p className="muted">
                  Po klubu: {rules.squad.players_per_team_in_db} igrača u sezoni (
                  {rules.squad.starters_on_field} u startnoj postavi +{' '}
                  {rules.squad.substitute_bench_slots} mjesta zamjene).{' '}
                  {rules.squad.note_bs}
                </p>
              </section>
              <section className="rules-section">
                <h3>Liga — format (demo)</h3>
                <p className="muted">
                  {rules.demo_league_format.team_count} klubova
                  {rules.demo_league_format.double_round_robin
                    ? ', dvostruki kružni sistem'
                    : ''}
                  :{' '}
                  <strong>{rules.demo_league_format.rounds_total}</strong> kola;
                  u svakom kolu{' '}
                  <strong>{rules.demo_league_format.matches_per_round}</strong>{' '}
                  utakmica, ukupno{' '}
                  <strong>
                    {rules.demo_league_format.matches_total_regular_season}
                  </strong>{' '}
                  u regularnoj sezoni. Zadnje kolo (datum u rasporedu):{' '}
                  <strong>
                    {rules.demo_league_format.last_round_match_date}
                  </strong>
                  ; kraj sezone u kalendaru:{' '}
                  <strong>
                    {rules.demo_league_format.season_calendar_end ?? '—'}
                  </strong>
                  .
                </p>
                <p className="compare-hint muted">
                  {rules.demo_league_format.note_bs}
                </p>
              </section>
              <section className="rules-section">
                <h3>Liga — bodovi</h3>
                <p className="muted">
                  Pobjeda {rules.league_points.win}, neriješeno{' '}
                  {rules.league_points.draw}, poraz {rules.league_points.loss}.{' '}
                  {rules.league_points.note_bs}
                </p>
              </section>
              <section className="rules-section">
                <h3>Ograničenja u ovom demo modelu</h3>
                <ul className="rules-list muted">
                  <li>Rezultat: {rules.this_application.result_covers}.</li>
                  <li>
                    Događaji: minut {rules.this_application.event_minute_min}–
                    {rules.this_application.event_minute_max}; nadoknada do +
                    {rules.this_application.minute_added_max}.
                  </li>
                </ul>
              </section>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
