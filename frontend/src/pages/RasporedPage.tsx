import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'

import type { MatchRow } from '../api/matches'
import { postSwapOpponents, postUpdateRound } from '../api/schedule'
import {
  MatchResultFlashRow,
  teamInitial,
} from '../components/LigaSections'
import { RoundsLoadMore } from '../components/RoundsLoadMore'
import { useLigaData } from '../context/LigaDataContext'
import { useProgressiveRounds } from '../hooks/useProgressiveRounds'
import {
  formatDate,
  formatDateWeekdayLong,
  formatMatchDateTime,
} from '../utils/formatDate'
import {
  groupMatchesByDate,
  matchCountLabelBs,
} from '../utils/matchCalendar'
import { sortMatchesForDisplay } from '../utils/sortMatches'

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

function editableRoundNumbersForSeason(
  allMatches: MatchRow[],
  seasonId: number,
): number[] {
  const byRound = new Map<number, MatchRow[]>()
  for (const m of allMatches) {
    if (m.season_id !== seasonId) continue
    const r = m.round_no
    const list = byRound.get(r) ?? []
    list.push(m)
    byRound.set(r, list)
  }
  const out: number[] = []
  for (const [r, ms] of [...byRound.entries()].sort((a, b) => a[0] - b[0])) {
    if (ms.length > 0 && ms.every((x) => x.status === 'scheduled')) {
      out.push(r)
    }
  }
  return out
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

/**
 * Nasumični parovi za kolo: svaki tim tačno jednom, domaćin/gost nasumično po paru.
 * Vraća `null` ako broj timova ne odgovara broju mečeva.
 */
function buildRandomRoundDraft(
  matchIdsSorted: number[],
  seasonTeamIds: number[],
): Map<number, { h: number; a: number }> | null {
  if (matchIdsSorted.length === 0) return null
  if (seasonTeamIds.length !== matchIdsSorted.length * 2) return null
  const pool = [...seasonTeamIds]
  shuffleInPlace(pool)
  const d = new Map<number, { h: number; a: number }>()
  let idx = 0
  for (const mid of matchIdsSorted) {
    const t1 = pool[idx++]
    const t2 = pool[idx++]
    if (Math.random() < 0.5) {
      d.set(mid, { h: t1, a: t2 })
    } else {
      d.set(mid, { h: t2, a: t1 })
    }
  }
  return d
}

type DraftCell = { mid: number; side: 'h' | 'a' }

function pickReplacementForCell(
  draft: Map<number, { h: number; a: number }>,
  mid: number,
  side: 'h' | 'a',
  seasonTeamIds: number[],
): number | null {
  const row = draft.get(mid)
  if (!row) return null
  const otherTeam = side === 'h' ? row.a : row.h
  const used = new Set<number>()
  for (const [m, { h, a }] of draft) {
    if (m === mid) {
      if (side === 'h') used.add(a)
      else used.add(h)
    } else {
      used.add(h)
      used.add(a)
    }
  }
  const candidates = seasonTeamIds.filter(
    (t) => !used.has(t) && t !== otherTeam,
  )
  return candidates[0] ?? null
}

/**
 * Nakon promjene jednog polja, uklanja duplikate timova u kolu tako što
 * ostala polja koja su „višak” zamijeni slobodnim timovima. Zaključano polje
 * (ono koje je korisnik upravo promijenio) ostaje kako je odabrano.
 */
function reconcileRoundDraft(
  draft: Map<number, { h: number; a: number }>,
  locked: DraftCell,
  seasonTeamIds: number[],
): Map<number, { h: number; a: number }> {
  const d = new Map(draft)
  for (let iter = 0; iter < 100; iter++) {
    const err = validateRoundDraft(d, seasonTeamIds)
    if (!err) return d

    const teamToCells = new Map<number, DraftCell[]>()
    for (const [mid, row] of d) {
      for (const side of ['h', 'a'] as const) {
        const t = side === 'h' ? row.h : row.a
        const list = teamToCells.get(t) ?? []
        list.push({ mid, side })
        teamToCells.set(t, list)
      }
    }

    let fixed = false

    for (const [, cells] of teamToCells) {
      if (cells.length <= 1) continue
      const toFix = cells.filter(
        (c) => !(c.mid === locked.mid && c.side === locked.side),
      )
      for (const c of toFix) {
        const rep = pickReplacementForCell(d, c.mid, c.side, seasonTeamIds)
        if (rep == null) continue
        const row = d.get(c.mid)!
        if (c.side === 'h') d.set(c.mid, { h: rep, a: row.a })
        else d.set(c.mid, { h: row.h, a: rep })
        fixed = true
      }
    }

    for (const [mid, row] of d) {
      if (row.h !== row.a) continue
      const rep = pickReplacementForCell(d, mid, 'a', seasonTeamIds)
      if (rep == null) continue
      d.set(mid, { h: row.h, a: rep })
      fixed = true
    }

    if (!fixed) return d
  }
  return d
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

  const [panelRoundNo, setPanelRoundNo] = useState<number | null>(null)
  const lastLoadedRoundRef = useRef<number | null>(null)
  const [draft, setDraft] = useState<Map<number, { h: number; a: number }>>(
    () => new Map(),
  )
  const [panelError, setPanelError] = useState<string | null>(null)
  const [panelOk, setPanelOk] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [swapA, setSwapA] = useState<number | null>(null)
  const [swapB, setSwapB] = useState<number | null>(null)

  const seasonName = useMemo(() => {
    if (selectedSeasonId == null) return null
    const s = seasons.find((x) => x.id === selectedSeasonId)
    return s?.name ?? null
  }, [seasons, selectedSeasonId])

  const editableRoundNumbers = useMemo(
    () =>
      selectedSeasonId == null
        ? []
        : editableRoundNumbersForSeason(matches, selectedSeasonId),
    [matches, selectedSeasonId],
  )

  const sortedCalendar = useMemo(
    () => sortMatchesForDisplay(matches),
    [matches],
  )

  const calendarProgressive = useProgressiveRounds(sortedCalendar, {
    resetKey: selectedSeasonId,
    enabled: selectedSeasonId != null,
  })

  const byDate = useMemo(
    () => groupMatchesByDate(calendarProgressive.displayedMatches),
    [calendarProgressive.displayedMatches],
  )

  const seasonTeamIds = useMemo(() => {
    const s = new Set<number>()
    for (const m of matches) {
      s.add(m.home_team_id)
      s.add(m.away_team_id)
    }
    return [...s].sort((a, b) => a - b)
  }, [matches])

  const nextEditable = useMemo(() => {
    if (panelRoundNo == null || selectedSeasonId == null) return null
    const ms = matches
      .filter(
        (m) => m.season_id === selectedSeasonId && m.round_no === panelRoundNo,
      )
      .sort((a, b) => a.id - b.id)
    if (!ms.length) return null
    return { round_no: panelRoundNo, matches: ms }
  }, [matches, selectedSeasonId, panelRoundNo])

  const roundTeamIds = useMemo(() => {
    if (!nextEditable?.matches.length) return []
    const s = new Set<number>()
    for (const m of nextEditable.matches) {
      s.add(m.home_team_id)
      s.add(m.away_team_id)
    }
    return [...s].sort((a, b) => a - b)
  }, [nextEditable])

  useEffect(() => {
    lastLoadedRoundRef.current = null
  }, [selectedSeasonId])

  useEffect(() => {
    if (selectedSeasonId == null) return
    setPanelRoundNo((prev) => {
      if (editableRoundNumbers.length === 0) return null
      if (prev != null && editableRoundNumbers.includes(prev)) return prev
      return editableRoundNumbers[0]!
    })
  }, [selectedSeasonId, editableRoundNumbers])

  useEffect(() => {
    if (selectedSeasonId == null || panelRoundNo == null) {
      setDraft(new Map())
      lastLoadedRoundRef.current = null
      return
    }
    const ms = matches
      .filter(
        (m) => m.season_id === selectedSeasonId && m.round_no === panelRoundNo,
      )
      .sort((a, b) => a.id - b.id)
    if (!ms.length) return

    if (lastLoadedRoundRef.current === panelRoundNo) return
    lastLoadedRoundRef.current = panelRoundNo
    setDraft(draftFromMatches(ms))
    setSwapA(null)
    setSwapB(null)
    setPanelOk(null)
  }, [selectedSeasonId, panelRoundNo, matches])

  const sameMatchSwap =
    swapA != null &&
    swapB != null &&
    nextEditable != null &&
    nextEditable.matches.some(
      (m) =>
        (m.home_team_id === swapA || m.away_team_id === swapA) &&
        (m.home_team_id === swapB || m.away_team_id === swapB),
    )

  const discardPanelChanges = useCallback(() => {
    setPanelError(null)
    setPanelOk(null)
    if (panelRoundNo == null || selectedSeasonId == null) return
    const ms = matches
      .filter(
        (m) => m.season_id === selectedSeasonId && m.round_no === panelRoundNo,
      )
      .sort((a, b) => a.id - b.id)
    setDraft(draftFromMatches(ms))
    setSwapA(null)
    setSwapB(null)
  }, [matches, selectedSeasonId, panelRoundNo])

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
      setDraft((d) => {
        const after = updatePair(matchId, 'h', v, d)
        return reconcileRoundDraft(after, { mid: matchId, side: 'h' }, seasonTeamIds)
      })
      setPanelError(null)
      setPanelOk(null)
    },
    [seasonTeamIds, updatePair],
  )

  const onAwayChange = useCallback(
    (matchId: number, e: ChangeEvent<HTMLSelectElement>) => {
      const v = Number(e.target.value)
      setDraft((d) => {
        const after = updatePair(matchId, 'a', v, d)
        return reconcileRoundDraft(after, { mid: matchId, side: 'a' }, seasonTeamIds)
      })
      setPanelError(null)
      setPanelOk(null)
    },
    [seasonTeamIds, updatePair],
  )

  const onSaveRound = useCallback(async () => {
    if (selectedSeasonId == null || nextEditable?.round_no == null) return
    const err = validateRoundDraft(draft, seasonTeamIds)
    if (err) {
      setPanelError(err)
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
      })
      setDraft(draftFromMatches(updated))
      await refreshSeasonData()
      setPanelOk('Raspored kola je sačuvan (termini u kalendaru ostaju kao u podacima).')
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Snimanje rasporeda nije uspjelo.'
      setPanelError(msg)
    } finally {
      setSaving(false)
    }
  }, [draft, nextEditable, refreshSeasonData, seasonTeamIds, selectedSeasonId])

  const onRandomRound = useCallback(() => {
    if (!nextEditable?.matches.length) return
    const ids = nextEditable.matches.map((m) => m.id).sort((a, b) => a - b)
    const next = buildRandomRoundDraft(ids, seasonTeamIds)
    if (!next) {
      setPanelError(
        'Broj timova u sezoni ne odgovara broju mečeva u kolu — nasumično kolo nije moguće.',
      )
      setPanelOk(null)
      return
    }
    setDraft(next)
    setPanelError(null)
    setPanelOk(
      'Nasumični parovi su postavljeni u obrascu. Sačuvaj raspored ako želiš zadržati u bazi.',
    )
  }, [nextEditable, seasonTeamIds])

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
              ? `Sezona ${seasonName}: lista po kolima (naslov), datum i termin uz svako kolo. Prikaz: prvo jedno kolo, zatim „Prikaži još” za sljedeće.`
              : 'Utakmice grupisane po kolima; datum je u drugom redu uz broj kola. Prikaz: prvo jedno kolo, zatim „Prikaži još” za sljedeće.'}{' '}
            {detailLoading && <span className="muted">Osvježavanje…</span>}
          </p>
        </div>
        <div className="section-body">
          <div className="schedule-edit-panel" aria-label="Uređivanje budućeg kola">
            <h3 className="schedule-edit-title">Budući raspored</h3>
            <p className="schedule-edit-intro muted">
              Odigrana kola i rezultati se iz aplikacije ne mijenjaju. Možeš
              uređivati <strong>bilo koje kolo</strong> u kojem su{' '}
              <strong>sve</strong> utakmice u statusu <code>scheduled</code>{' '}
              (zakazane) — odaberi ga u padajućem izborniku. Ostala zakazana kola
              u podacima ne blokiraju parove — pravila dvostrukog kružnog sistema
              računaju samo završene mečeve. Kada promijeniš tim u paru, ostali
              mečevi u kolu se automatski prilagođavaju da svaki tim bude tačno
              jednom u kolu. Snimanje parova <strong>ne mijenja datum</strong>{' '}
              termina u kalendaru (ostaje kako je u bazi).
            </p>
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
            {!panelRoundNo && editableRoundNumbers.length === 0 && (
              <p className="muted">
                Trenutno nema koloslijeda za izmjenu (npr. sve utakmice su
                završene ili nema cijelog zakazanog kola).
              </p>
            )}
            {panelRoundNo != null && nextEditable && nextEditable.round_no != null && (
              <>
                <div className="schedule-round-date-row">
                  <label className="schedule-round-date-label">
                    Kolo za uređivanje
                    <select
                      className="schedule-team-select schedule-round-select"
                      value={panelRoundNo}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        setPanelRoundNo(v)
                        lastLoadedRoundRef.current = null
                        setPanelError(null)
                        setPanelOk(null)
                      }}
                      disabled={saving || editableRoundNumbers.length === 0}
                      aria-label="Odaberi kolo za uređivanje rasporeda"
                    >
                      {editableRoundNumbers.map((r) => (
                        <option key={r} value={r}>
                          Kolo {r}
                        </option>
                      ))}
                    </select>
                  </label>
                  {sortedEditMatches[0]?.match_date ? (
                    <span className="muted schedule-date-human">
                      Termin u podacima:{' '}
                      {formatDateWeekdayLong(
                        toDateInputValue(sortedEditMatches[0].match_date),
                      )}{' '}
                      (
                      {formatDate(
                        toDateInputValue(sortedEditMatches[0].match_date),
                      )}
                      )
                    </span>
                  ) : null}
                </div>
                <p className="muted schedule-date-hint">
                  Ovaj obrazac mijenja samo parove; datum utakmica ostaje u
                  postojećim podacima dok ga posebno ne ažuriraš.
                </p>
                <div className="match-results-board schedule-edit-board">
                  {sortedEditMatches.map((m) => {
                    const row = draft.get(m.id)
                    const h = row?.h ?? m.home_team_id
                    const a = row?.a ?? m.away_team_id
                    const dateForDisplay = m.match_date
                    return (
                      <article
                        key={m.id}
                        className="match-result-row schedule-edit-match-row"
                      >
                        <div className="match-result-time-col">
                          <span className="schedule-edit-match-no muted">
                            Meč #{m.id}
                          </span>
                          <time dateTime={toDateInputValue(dateForDisplay)}>
                            {formatMatchDateTime(
                              toDateInputValue(dateForDisplay),
                              m.kickoff_at,
                            )}
                          </time>
                        </div>
                        <div className="match-result-body">
                          <div className="match-result-line">
                            <span className="match-result-badge" aria-hidden>
                              {teamInitial(resolveTeam(h))}
                            </span>
                            <select
                              className="schedule-team-select schedule-team-select--flash"
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
                            <span className="match-result-goals muted">—</span>
                          </div>
                          <div className="match-result-line">
                            <span className="match-result-badge" aria-hidden>
                              {teamInitial(resolveTeam(a))}
                            </span>
                            <select
                              className="schedule-team-select schedule-team-select--flash"
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
                            <span className="match-result-goals muted">—</span>
                          </div>
                          <div className="match-result-footer">
                            <span className="status-chip">{m.status}</span>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
                <div className="schedule-edit-actions">
                  <button
                    type="button"
                    className="schedule-btn schedule-btn-secondary"
                    onClick={onRandomRound}
                    disabled={
                      saving ||
                      sortedEditMatches.length === 0 ||
                      seasonTeamIds.length !== sortedEditMatches.length * 2
                    }
                    title="Nasumično izmiješa timove u parove za ovo kolo (samo u obrascu dok ne sačuvaš)."
                  >
                    Random kolo
                  </button>
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
                    onClick={discardPanelChanges}
                    disabled={saving || panelRoundNo == null}
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
                <div className="match-results-board raspored-day-matches" role="list">
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
            (calendarProgressive.canShowMore || calendarProgressive.canShowLess) && (
            <RoundsLoadMore
              canShowMore={calendarProgressive.canShowMore}
              onShowMore={calendarProgressive.showMore}
              nextChunkLabel={calendarProgressive.nextChunkLabel}
              canShowLess={calendarProgressive.canShowLess}
              onShowLess={calendarProgressive.showLess}
              prevChunkLabel={calendarProgressive.prevChunkLabel}
            />
          )}
        </div>
      </div>
    </section>
  )
}
