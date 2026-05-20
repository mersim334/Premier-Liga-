import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from 'react'

import type { MatchRow } from '../api/matches'
import {
  getNextEditableRound,
  postSwapOpponents,
  postUpdateRound,
  type NextEditableRoundResponse,
} from '../api/schedule'
import { TeamClubLink } from '../components/TeamClubLink'
import { useLigaData } from '../context/LigaDataContext'
import { formatDate, formatDateWeekdayLong } from '../utils/formatDate'
import { sortMatchesForDisplay } from '../utils/sortMatches'

/** Grupiše utakmice po datumu (kalendarski raspored kola). */
function groupMatchesByDate(matches: MatchRow[]): {
  date: string
  rounds: Set<number>
  matches: MatchRow[]
}[] {
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
function matchCountLabelBs(n: number): string {
  if (n === 1) return '1 utakmica'
  const m10 = n % 10
  const m100 = n % 100
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) {
    return `${n} utakmice`
  }
  return `${n} utakmica`
}

function draftFromMatches(rows: MatchRow[]): Map<number, { h: number; a: number }> {
  const d = new Map<number, { h: number; a: number }>()
  for (const m of rows) {
    d.set(m.id, { h: m.home_team_id, a: m.away_team_id })
  }
  return d
}

function toDateInputValue(matchDate: string): string {
  return matchDate.length >= 10 ? matchDate.slice(0, 10) : matchDate
}

/** ISO yyyy-mm-dd; *deltaDays* može biti negativan. */
function shiftIsoDate(iso: string, deltaDays: number): string {
  const d = new Date(`${toDateInputValue(iso)}T12:00:00`)
  d.setDate(d.getDate() + deltaDays)
  return d.toISOString().slice(0, 10)
}

function validateRoundDraft(
  draft: Map<number, { h: number; a: number }>,
  expectedTeams: number[],
): string | null {
  const exp = new Set(expectedTeams)
  const used = new Set<number>()
  for (const [, { h, a }] of draft) {
    if (h === a) {
      return 'Domaćin i gost ne mogu biti isti tim u jednom meču.'
    }
    if (!exp.has(h) || !exp.has(a)) {
      return 'Odaberi timove koji sudjeluju u ovoj sezoni.'
    }
    for (const t of [h, a]) {
      if (used.has(t)) {
        return 'Svaki tim smije igrati samo jedan meč u ovom kolu.'
      }
      used.add(t)
    }
  }
  if (used.size !== exp.size) {
    return 'Moraš rasporediti sve timove tačno jednom.'
  }
  return null
}

export function RasporedPage() {
  const {
    selectedSeasonId,
    matches,
    detailLoading,
    resolveTeam,
    seasons,
    refreshSeasonData,
  } = useLigaData()

  const [nextEditable, setNextEditable] =
    useState<NextEditableRoundResponse | null>(null)
  const [draft, setDraft] = useState<Map<number, { h: number; a: number }>>(
    () => new Map(),
  )
  const [panelLoading, setPanelLoading] = useState(false)
  const [panelError, setPanelError] = useState<string | null>(null)
  const [panelOk, setPanelOk] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [swapA, setSwapA] = useState<number | null>(null)
  const [swapB, setSwapB] = useState<number | null>(null)
  const [editableRoundDate, setEditableRoundDate] = useState('')

  const seasonName = useMemo(() => {
    if (selectedSeasonId == null) return null
    const s = seasons.find((x) => x.id === selectedSeasonId)
    return s?.name ?? null
  }, [seasons, selectedSeasonId])

  const byDate = useMemo(() => groupMatchesByDate(matches), [matches])

  const seasonTeamIds = useMemo(() => {
    const s = new Set<number>()
    for (const m of matches) {
      s.add(m.home_team_id)
      s.add(m.away_team_id)
    }
    return [...s].sort((a, b) => a - b)
  }, [matches])

  const roundTeamIds = useMemo(() => {
    if (!nextEditable?.matches.length) return []
    const s = new Set<number>()
    for (const m of nextEditable.matches) {
      s.add(m.home_team_id)
      s.add(m.away_team_id)
    }
    return [...s].sort((a, b) => a - b)
  }, [nextEditable])

  const roundDateBounds = useMemo(() => {
    if (nextEditable?.round_no == null) {
      return { min: '', max: '' }
    }
    const rno = nextEditable.round_no
    let priorMax = ''
    let laterMin = ''
    for (const m of matches) {
      if (m.round_no < rno) {
        if (!priorMax || m.match_date > priorMax) priorMax = m.match_date
      } else if (m.round_no > rno) {
        if (!laterMin || m.match_date < laterMin) laterMin = m.match_date
      }
    }
    const min = priorMax ? shiftIsoDate(priorMax, 1) : ''
    const max = laterMin ? shiftIsoDate(laterMin, -1) : ''
    return { min, max }
  }, [matches, nextEditable])

  const sameMatchSwap =
    swapA != null &&
    swapB != null &&
    nextEditable != null &&
    nextEditable.matches.some(
      (m) =>
        (m.home_team_id === swapA || m.away_team_id === swapA) &&
        (m.home_team_id === swapB || m.away_team_id === swapB),
    )

  const loadEditablePanel = useCallback(async (seasonId: number) => {
    setPanelLoading(true)
    setPanelError(null)
    setPanelOk(null)
    try {
      const r = await getNextEditableRound(seasonId)
      setNextEditable(r)
      setDraft(draftFromMatches(r.matches))
      const fd = r.matches[0]?.match_date
      setEditableRoundDate(fd ? toDateInputValue(fd) : '')
      setSwapA(null)
      setSwapB(null)
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Neuspjelo učitavanje uređivog kola.'
      setPanelError(msg)
      setNextEditable(null)
      setDraft(new Map())
      setEditableRoundDate('')
    } finally {
      setPanelLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedSeasonId == null) return
    void loadEditablePanel(selectedSeasonId)
  }, [selectedSeasonId, loadEditablePanel])

  const updatePair = useCallback(
    (
      matchId: number,
      field: 'h' | 'a',
      value: number,
      prev: Map<number, { h: number; a: number }>,
    ) => {
      const row = prev.get(matchId)
      if (!row) return prev
      const next = new Map(prev)
      if (field === 'h') {
        next.set(matchId, { h: value, a: row.a })
      } else {
        next.set(matchId, { h: row.h, a: value })
      }
      return next
    },
    [],
  )

  const onHomeChange = useCallback(
    (matchId: number, e: ChangeEvent<HTMLSelectElement>) => {
      const v = Number(e.target.value)
      setDraft((d) => updatePair(matchId, 'h', v, d))
      setPanelOk(null)
    },
    [updatePair],
  )

  const onAwayChange = useCallback(
    (matchId: number, e: ChangeEvent<HTMLSelectElement>) => {
      const v = Number(e.target.value)
      setDraft((d) => updatePair(matchId, 'a', v, d))
      setPanelOk(null)
    },
    [updatePair],
  )

  const onSaveRound = useCallback(async () => {
    if (selectedSeasonId == null || nextEditable?.round_no == null) return
    const err = validateRoundDraft(draft, seasonTeamIds)
    if (err) {
      setPanelError(err)
      return
    }
    if (!editableRoundDate.trim()) {
      setPanelError('Odaberi datum kola.')
      return
    }
    setPanelError(null)
    setSaving(true)
    try {
      const pairings = [...draft.entries()]
        .sort(([x], [y]) => x - y)
        .map(([match_id, { h, a }]) => ({
          match_id,
          home_team_id: h,
          away_team_id: a,
        }))
      const updated = await postUpdateRound({
        season_id: selectedSeasonId,
        round_no: nextEditable.round_no,
        pairings,
        match_date: editableRoundDate,
      })
      setNextEditable({
        round_no: nextEditable.round_no,
        matches: updated,
      })
      setDraft(draftFromMatches(updated))
      const u0 = updated[0]?.match_date
      if (u0) setEditableRoundDate(toDateInputValue(u0))
      await refreshSeasonData()
      setPanelOk('Raspored kola je sačuvan.')
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Snimanje rasporeda nije uspjelo.'
      setPanelError(msg)
    } finally {
      setSaving(false)
    }
  }, [
    editableRoundDate,
    draft,
    nextEditable,
    refreshSeasonData,
    seasonTeamIds,
    selectedSeasonId,
  ])

  const onSwap = useCallback(async () => {
    if (
      selectedSeasonId == null ||
      nextEditable?.round_no == null ||
      swapA == null ||
      swapB == null ||
      swapA === swapB
    ) {
      return
    }
    setPanelError(null)
    setSaving(true)
    try {
      const updated = await postSwapOpponents({
        season_id: selectedSeasonId,
        round_no: nextEditable.round_no,
        team_a: swapA,
        team_b: swapB,
      })
      setNextEditable({
        round_no: nextEditable.round_no,
        matches: updated,
      })
      setDraft(draftFromMatches(updated))
      await refreshSeasonData()
      setPanelOk('Zamjena protivnika je sačuvana.')
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Zamjena protivnika nije uspjela.'
      setPanelError(msg)
    } finally {
      setSaving(false)
    }
  }, [nextEditable, refreshSeasonData, selectedSeasonId, swapA, swapB])

  if (selectedSeasonId == null) {
    return (
      <p className="muted">
        Odaberi sezonu iz alatne trake da vidiš raspored.
      </p>
    )
  }

  const sortedEditMatches =
    nextEditable?.matches.slice().sort((a, b) => a.id - b.id) ?? []

  return (
    <section className="raspored-page" aria-label="Raspored utakmica">
      <div className="section-card">
        <div className="section-head">
          <h2>Raspored</h2>
          <p className="section-hint">
            {seasonName
              ? `Sezona ${seasonName}: svi termini po datumima (isto što i u bazi: kolo + datum).`
              : 'Utakmice grupisane po danu odigravanja.'}{' '}
            {detailLoading && <span className="muted">Osvježavanje…</span>}
          </p>
        </div>
        <div className="section-body">
          <div className="schedule-edit-panel" aria-label="Uređivanje budućeg kola">
            <h3 className="schedule-edit-title">Budući raspored</h3>
            <p className="schedule-edit-intro muted">
              Odigrana kola i rezultati se iz aplikacije ne mijenjaju. Možeš
              uređivati samo prvo kolo u kojem su <strong>sve</strong> utakmice
              u statusu <code>scheduled</code> (zakazane). Ostala zakazana kola u
              podacima ne blokiraju parove — pravila dvostrukog kružnog sistema
              računaju samo završene mečeve.
            </p>
            {panelLoading && (
              <p className="muted">Učitavanje podataka za uređivanje…</p>
            )}
            {panelError && (
              <p className="schedule-msg schedule-msg-error" role="alert">
                {panelError}
              </p>
            )}
            {panelOk && (
              <p className="schedule-msg schedule-msg-ok" role="status">
                {panelOk}
              </p>
            )}
            {!panelLoading && nextEditable?.round_no == null && (
              <p className="muted">
                Trenutno nema koloslijeda za izmjenu (npr. sve utakmice su
                završene ili nema cijelog zakazanog kola).
              </p>
            )}
            {!panelLoading && nextEditable && nextEditable.round_no != null && (
              <>
                <p className="schedule-edit-kolo">
                  <strong>Kolo {nextEditable.round_no}</strong> — isti dan za
                  sve mečeve u kolu; nakon snimanja lista ispod i kraj sezone u
                  kalendaru prilagođavaju se.
                </p>
                <div className="schedule-round-date-row">
                  <label className="schedule-round-date-label">
                    Datum kola
                    <input
                      type="date"
                      className="schedule-date-input"
                      value={editableRoundDate}
                      min={roundDateBounds.min || undefined}
                      max={roundDateBounds.max || undefined}
                      onChange={(e) => {
                        setEditableRoundDate(e.target.value)
                        setPanelOk(null)
                      }}
                      disabled={saving}
                      required
                    />
                  </label>
                  {editableRoundDate ? (
                    <span className="muted schedule-date-human">
                      {formatDateWeekdayLong(editableRoundDate)} (
                      {formatDate(editableRoundDate)})
                    </span>
                  ) : null}
                </div>
                <p className="muted schedule-date-hint">
                  Moraju svi termini ranijih kola biti prije ovog datuma, a
                  svi kasnijih kola poslije. U bazi se zatim ažurira i
                  kalendar kraja sezone (zadnji meč + 7 dana).
                </p>
                <div className="table-wrap">
                  <table className="data-table schedule-edit-table">
                    <thead>
                      <tr>
                        <th className="numeric">Meč</th>
                        <th>Domaćin</th>
                        <th>Gost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedEditMatches.map((m) => {
                        const row = draft.get(m.id)
                        const h = row?.h ?? m.home_team_id
                        const a = row?.a ?? m.away_team_id
                        return (
                          <tr key={m.id}>
                            <td className="numeric">{m.id}</td>
                            <td>
                              <select
                                className="schedule-team-select"
                                value={h}
                                onChange={(e) => onHomeChange(m.id, e)}
                                disabled={saving}
                                aria-label={`Domaćin za meč ${m.id}`}
                              >
                                {seasonTeamIds.map((tid) => (
                                  <option key={tid} value={tid}>
                                    {resolveTeam(tid)}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <select
                                className="schedule-team-select"
                                value={a}
                                onChange={(e) => onAwayChange(m.id, e)}
                                disabled={saving}
                                aria-label={`Gost za meč ${m.id}`}
                              >
                                {seasonTeamIds.map((tid) => (
                                  <option key={tid} value={tid}>
                                    {resolveTeam(tid)}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="schedule-edit-actions">
                  <button
                    type="button"
                    className="schedule-btn schedule-btn-primary"
                    onClick={() => void onSaveRound()}
                    disabled={saving || sortedEditMatches.length === 0}
                  >
                    {saving ? 'Snimam…' : 'Sačuvaj raspored kola'}
                  </button>
                  <button
                    type="button"
                    className="schedule-btn schedule-btn-muted"
                    onClick={() => void loadEditablePanel(selectedSeasonId)}
                    disabled={saving || panelLoading}
                  >
                    Odbaci izmjene (ponovo učitaj)
                  </button>
                </div>
                <div className="schedule-swap-block">
                  <h4 className="schedule-swap-title">Zamjena protivnika</h4>
                  <p className="muted schedule-swap-hint">
                    Dva tima iz <em>različita</em> meča umjenjuju protivnike.
                    Mora ostati ispravan dvostruki kružni sistem — API može
                    odbiti zamjenu.
                  </p>
                  <div className="schedule-swap-row">
                    <label className="schedule-swap-label">
                      Tim A
                      <select
                        className="schedule-team-select"
                        value={swapA ?? ''}
                        onChange={(e) => {
                          const v = e.target.value
                          setSwapA(v === '' ? null : Number(v))
                          setPanelOk(null)
                        }}
                        disabled={saving}
                      >
                        <option value="">—</option>
                        {roundTeamIds.map((tid) => (
                          <option key={tid} value={tid}>
                            {resolveTeam(tid)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="schedule-swap-label">
                      Tim B
                      <select
                        className="schedule-team-select"
                        value={swapB ?? ''}
                        onChange={(e) => {
                          const v = e.target.value
                          setSwapB(v === '' ? null : Number(v))
                          setPanelOk(null)
                        }}
                        disabled={saving}
                      >
                        <option value="">—</option>
                        {roundTeamIds.map((tid) => (
                          <option key={tid} value={tid}>
                            {resolveTeam(tid)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="schedule-btn schedule-btn-secondary"
                      onClick={() => void onSwap()}
                      disabled={
                        saving ||
                        swapA == null ||
                        swapB == null ||
                        swapA === swapB ||
                        sameMatchSwap
                      }
                    >
                      Primijeni zamjenu
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {matches.length === 0 && !detailLoading && (
            <p className="muted">Nema utakmica u rasporedu za ovu sezonu.</p>
          )}
          {byDate.map(({ date, rounds, matches: dayMatches }) => {
            const roundLabel =
              rounds.size === 1
                ? `Kolo ${[...rounds][0]}`
                : `Kola ${[...rounds].sort((a, b) => a - b).join(', ')}`
            return (
              <div key={date} className="raspored-day-block">
                <h3 className="raspored-day-head">
                  <span className="raspored-day-title">
                    {formatDateWeekdayLong(date)}
                  </span>
                  <span className="raspored-day-meta muted">
                    {roundLabel} · {matchCountLabelBs(dayMatches.length)}
                  </span>
                </h3>
                <div className="table-wrap">
                  <table className="data-table raspored-table">
                    <thead>
                      <tr>
                        <th className="numeric">Kr.</th>
                        <th className="team-col">Domaćin</th>
                        <th className="numeric">Rez.</th>
                        <th className="team-col">Gost</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayMatches.map((m) => (
                        <tr key={m.id}>
                          <td className="numeric">{m.round_no}</td>
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
