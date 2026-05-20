import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'

import type { MatchRow } from '../api/matches'
import {
  createMatchEvent,
  deleteMatchEvent,
  MATCH_EVENT_TYPE_LABELS,
  MATCH_EVENT_TYPES,
  patchMatchEvent,
  type MatchEventCreateBody,
  type MatchEventRow,
  type MatchEventType,
} from '../api/match-events'
import type { PlayerRow } from '../api/players'
import { MAX_MINUTE_ADDED, REGULATION_MINUTES } from '../domain/football'

import { PlayerProfileLink } from './PlayerProfileLink'
import { TeamClubLink } from './TeamClubLink'

const RANDOM_EVENT_WEIGHTS: { type: MatchEventType; w: number }[] = [
  { type: 'goal', w: 22 },
  { type: 'yellow_card', w: 14 },
  { type: 'substitution', w: 10 },
  { type: 'penalty_scored', w: 5 },
  { type: 'penalty_missed', w: 3 },
  { type: 'red_card', w: 3 },
  { type: 'own_goal', w: 3 },
]

const RANDOM_WEIGHT_TOTAL = RANDOM_EVENT_WEIGHTS.reduce((s, x) => s + x.w, 0)

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

function pickWeightedEventType(): MatchEventType {
  let r = Math.random() * RANDOM_WEIGHT_TOTAL
  for (const { type, w } of RANDOM_EVENT_WEIGHTS) {
    r -= w
    if (r <= 0) return type
  }
  return 'goal'
}

function pickPlayer(ps: PlayerRow[]): PlayerRow {
  return ps[Math.floor(Math.random() * ps.length)]!
}

/** 6–13 događaja, valjani igrači po timu / sezoni; sortirano po minutu. */
function buildRandomMatchEventPayloads(
  match: MatchRow,
  homePlayers: PlayerRow[],
  awayPlayers: PlayerRow[],
): MatchEventCreateBody[] {
  const n = 6 + Math.floor(Math.random() * 8)
  const homeId = match.home_team_id
  const awayId = match.away_team_id

  const minutePool = Array.from({ length: REGULATION_MINUTES }, (_, i) => i + 1)
  shuffleInPlace(minutePool)
  const minutes = minutePool.slice(0, n).sort((a, b) => a - b)

  const squadFor = (teamId: number) =>
    teamId === homeId ? homePlayers : awayPlayers

  const out: MatchEventCreateBody[] = []

  for (let i = 0; i < n; i++) {
    const minute = minutes[i]!
    const nearHalf = minute === 45 || minute === 46
    const nearEnd = minute >= 88
    const minute_added =
      (nearHalf || nearEnd || Math.random() < 0.08) && Math.random() < 0.4
        ? 1 + Math.floor(Math.random() * Math.min(5, MAX_MINUTE_ADDED))
        : null

    const teamId = Math.random() < 0.52 ? homeId : awayId
    const squad = squadFor(teamId)
    let eventType = pickWeightedEventType()
    if (eventType === 'substitution' && squad.length < 2) {
      eventType = Math.random() < 0.55 ? 'goal' : 'yellow_card'
    }

    let player_id: number | null
    let related_player_id: number | null

    if (eventType === 'substitution') {
      const perm = [...squad]
      shuffleInPlace(perm)
      player_id = perm[0]!.id
      related_player_id = perm[1]!.id
    } else {
      player_id = pickPlayer(squad).id
      related_player_id = null
    }

    out.push({
      match_id: match.id,
      team_id: teamId,
      minute,
      minute_added,
      event_type: eventType,
      player_id,
      related_player_id,
      notes: null,
    })
  }

  out.sort((a, b) => {
    const ma = a.minute_added ?? -1
    const mb = b.minute_added ?? -1
    if (a.minute !== b.minute) return a.minute - b.minute
    return ma - mb
  })

  return out
}

type Props = {
  match: MatchRow
  players: PlayerRow[]
  events: MatchEventRow[]
  detailLoading: boolean
  resolveTeam: (id: number) => string
  playerNameById: Map<number, string>
  onRefresh: () => Promise<void>
}

function emptyFormState(match: MatchRow) {
  return {
    minute: '1',
    minuteAdded: '',
    eventType: 'goal' as MatchEventType,
    teamId: match.home_team_id,
    playerId: '',
    relatedPlayerId: '',
    notes: '',
  }
}

type PendingRandomEvent = { key: string; body: MatchEventCreateBody }

function formMatchesEmpty(
  match: MatchRow,
  minute: string,
  minuteAdded: string,
  eventType: MatchEventType,
  teamId: number,
  playerId: string,
  relatedPlayerId: string,
  notes: string,
) {
  const s = emptyFormState(match)
  return (
    minute === s.minute &&
    minuteAdded === s.minuteAdded &&
    eventType === s.eventType &&
    teamId === s.teamId &&
    playerId === s.playerId &&
    relatedPlayerId === s.relatedPlayerId &&
    notes === s.notes
  )
}

export function MatchEventsForm({
  match,
  players,
  events,
  detailLoading,
  resolveTeam,
  playerNameById,
  onRefresh,
}: Props) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [minute, setMinute] = useState('1')
  const [minuteAdded, setMinuteAdded] = useState('')
  const [eventType, setEventType] = useState<MatchEventType>('goal')
  const [teamId, setTeamId] = useState(match.home_team_id)
  const [playerId, setPlayerId] = useState('')
  const [relatedPlayerId, setRelatedPlayerId] = useState('')
  const [notes, setNotes] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [localOk, setLocalOk] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [pendingRandomEvents, setPendingRandomEvents] = useState<
    PendingRandomEvent[]
  >([])

  const resetToNew = useCallback(() => {
    const s = emptyFormState(match)
    setEditingId(null)
    setMinute(s.minute)
    setMinuteAdded(s.minuteAdded)
    setEventType(s.eventType)
    setTeamId(s.teamId)
    setPlayerId(s.playerId)
    setRelatedPlayerId(s.relatedPlayerId)
    setNotes(s.notes)
    setLocalError(null)
  }, [match])

  useEffect(() => {
    resetToNew()
    setPendingRandomEvents([])
  }, [match.id, resetToNew])

  const tableRows = useMemo(() => {
    type Row =
      | { kind: 'server'; ev: MatchEventRow }
      | { kind: 'pending'; key: string; body: MatchEventCreateBody }
    const server: Row[] = events.map((ev) => ({ kind: 'server', ev }))
    const pending: Row[] = pendingRandomEvents.map(({ key, body }) => ({
      kind: 'pending',
      key,
      body,
    }))
    const merged = [...server, ...pending]
    merged.sort((a, b) => {
      const ma = a.kind === 'server' ? a.ev.minute : a.body.minute
      const mb = b.kind === 'server' ? b.ev.minute : b.body.minute
      const aa =
        a.kind === 'server'
          ? a.ev.minute_added ?? -1
          : a.body.minute_added ?? -1
      const ba =
        b.kind === 'server'
          ? b.ev.minute_added ?? -1
          : b.body.minute_added ?? -1
      if (ma !== mb) return ma - mb
      return aa - ba
    })
    return merged
  }, [events, pendingRandomEvents])

  const squadOnTeam = useMemo(
    () =>
      players.filter(
        (p) =>
          p.team_id === teamId &&
          p.season_id === match.season_id,
      ),
    [players, teamId, match.season_id],
  )

  const loadEdit = (ev: MatchEventRow) => {
    setEditingId(ev.id)
    setMinute(String(ev.minute))
    setMinuteAdded(
      ev.minute_added != null ? String(ev.minute_added) : '',
    )
    setEventType(ev.event_type as MatchEventType)
    setTeamId(ev.team_id)
    setPlayerId(ev.player_id != null ? String(ev.player_id) : '')
    setRelatedPlayerId(
      ev.related_player_id != null ? String(ev.related_player_id) : '',
    )
    setNotes(ev.notes ?? '')
    setLocalError(null)
    setLocalOk(null)
  }

  const parseMinuteAdded = (): number | null => {
    const t = minuteAdded.trim()
    if (t === '') return null
    const n = Number(t)
    if (!Number.isInteger(n) || n < 0 || n > MAX_MINUTE_ADDED) {
      return NaN
    }
    return n
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    setLocalOk(null)

    const formIsDefault = formMatchesEmpty(
      match,
      minute,
      minuteAdded,
      eventType,
      teamId,
      playerId,
      relatedPlayerId,
      notes,
    )
    const hasPending = pendingRandomEvents.length > 0

    const m = Number(minute)
    const ma = parseMinuteAdded()
    const pid =
      playerId.trim() === '' ? null : Number(playerId)
    const rid =
      relatedPlayerId.trim() === '' ? null : Number(relatedPlayerId)

    if (editingId != null) {
      if (!Number.isInteger(m) || m < 1 || m > REGULATION_MINUTES) {
        setLocalError(
          `Minut mora biti cijeli broj od 1 do ${REGULATION_MINUTES}.`,
        )
        return
      }
      if (Number.isNaN(ma)) {
        setLocalError(
          `Nadoknada mora biti prazna ili cijeli broj 0–${MAX_MINUTE_ADDED}.`,
        )
        return
      }
      if (eventType === 'substitution') {
        if (pid == null || rid == null) {
          setLocalError(
            'Zamjena zahtijeva igrača koji izlazi i onoga koji ulazi.',
          )
          return
        }
        if (pid === rid) {
          setLocalError('Izlazeći i ulazeći moraju biti različiti.')
          return
        }
      } else {
        const needPlayer = [
          'goal',
          'own_goal',
          'yellow_card',
          'red_card',
          'penalty_scored',
          'penalty_missed',
        ].includes(eventType)
        if (needPlayer && pid == null) {
          setLocalError('Odaberi igrača za ovaj tip događaja.')
          return
        }
        if (rid != null) {
          setLocalError('Povezani igrač važi samo za zamjenu.')
          return
        }
      }
    } else if (!formIsDefault) {
      if (!Number.isInteger(m) || m < 1 || m > REGULATION_MINUTES) {
        setLocalError(
          `Minut mora biti cijeli broj od 1 do ${REGULATION_MINUTES}.`,
        )
        return
      }
      if (Number.isNaN(ma)) {
        setLocalError(
          `Nadoknada mora biti prazna ili cijeli broj 0–${MAX_MINUTE_ADDED}.`,
        )
        return
      }
      if (eventType === 'substitution') {
        if (pid == null || rid == null) {
          setLocalError(
            'Zamjena zahtijeva igrača koji izlazi i onoga koji ulazi.',
          )
          return
        }
        if (pid === rid) {
          setLocalError('Izlazeći i ulazeći moraju biti različiti.')
          return
        }
      } else {
        const needPlayer = [
          'goal',
          'own_goal',
          'yellow_card',
          'red_card',
          'penalty_scored',
          'penalty_missed',
        ].includes(eventType)
        if (needPlayer && pid == null) {
          setLocalError('Odaberi igrača za ovaj tip događaja.')
          return
        }
        if (rid != null) {
          setLocalError('Povezani igrač važi samo za zamjenu.')
          return
        }
      }
    } else if (!hasPending) {
      setLocalError(
        'Nema ništa za snimiti — popuni formu ili dodaj nasumičnu radnu verziju.',
      )
      return
    }

    setSubmitting(true)
    try {
      const wasEditing = editingId != null
      let savedPending = 0
      if (hasPending) {
        for (const { body } of pendingRandomEvents) {
          await createMatchEvent(body)
        }
        savedPending = pendingRandomEvents.length
        setPendingRandomEvents([])
      }

      if (editingId != null) {
        await patchMatchEvent(editingId, {
          team_id: teamId,
          minute: m,
          minute_added: ma,
          event_type: eventType,
          player_id: pid,
          related_player_id: eventType === 'substitution' ? rid : null,
          notes: notes.trim() || null,
        })
        setEditingId(null)
      } else if (!formIsDefault) {
        await createMatchEvent({
          match_id: match.id,
          team_id: teamId,
          minute: m,
          minute_added: ma,
          event_type: eventType,
          player_id: pid,
          related_player_id: eventType === 'substitution' ? rid : null,
          notes: notes.trim() || null,
        })
      }

      const tail =
        ' Rezultat, status meča i tablica su osvježeni gdje pravila to zahtijevaju.'
      const parts: string[] = []
      if (savedPending > 0) {
        parts.push(
          savedPending === 1
            ? 'Jedan događaj iz radne verzije snimljen.'
            : `Snimljeno je ${savedPending} događaja iz radne verzije.`,
        )
      }
      if (wasEditing) {
        parts.push('Izmjena postojećeg događaja sačuvana.')
      } else if (!formIsDefault) {
        parts.push('Novi događaj iz forme sačuvan.')
      }
      if (parts.length === 0) {
        parts.push('Sačuvano.')
      }
      setLocalOk(parts.join(' ') + tail)

      resetToNew()
      await onRefresh()
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Snimanje nije uspjelo.'
      setLocalError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const onRandomFill = () => {
    const homeP = players.filter(
      (p) =>
        p.team_id === match.home_team_id && p.season_id === match.season_id,
    )
    const awayP = players.filter(
      (p) =>
        p.team_id === match.away_team_id && p.season_id === match.season_id,
    )
    if (homeP.length < 1 || awayP.length < 1) {
      setLocalError(
        'Za nasumično popunjavanje potrebni su igrači u podacima za domaćina i gosta u ovoj sezoni.',
      )
      setLocalOk(null)
      return
    }
    if (
      events.length > 0 &&
      !window.confirm(
        'Već postoje događaji na ovom meču. Dodati nasumične u radnu verziju uz postojeće?',
      )
    ) {
      return
    }
    setLocalError(null)
    setLocalOk(null)
    const payloads = buildRandomMatchEventPayloads(match, homeP, awayP)
    setPendingRandomEvents((prev) => [
      ...prev,
      ...payloads.map((body) => ({
        key: crypto.randomUUID(),
        body,
      })),
    ])
    setLocalOk(
      `Dodato je ${payloads.length} događaja u radnu verziju (još nije na serveru). Klikni Sačuvaj da ih snimiš.`,
    )
  }

  const removePendingRandom = (key: string) => {
    setPendingRandomEvents((prev) => prev.filter((p) => p.key !== key))
  }

  const clearPendingRandom = () => {
    if (pendingRandomEvents.length === 0) return
    if (
      !window.confirm(
        'Odbaciti sve događaje u radnoj verziji (bez slanja na server)?',
      )
    ) {
      return
    }
    setPendingRandomEvents([])
    setLocalOk(null)
  }

  const onDelete = async (id: number) => {
    if (!window.confirm('Obrisati ovaj događaj?')) return
    setLocalError(null)
    setLocalOk(null)
    setSubmitting(true)
    try {
      await deleteMatchEvent(id)
      if (editingId === id) resetToNew()
      setLocalOk('Obrisano. Rezultat i ostali prikazi su osvježeni.')
      await onRefresh()
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Brisanje nije uspjelo.'
      setLocalError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const substitution = eventType === 'substitution'

  return (
    <div className="match-events-form-block">
      <form className="match-event-form" onSubmit={(e: FormEvent) => void onSubmit(e)}>
        <h3 className="match-event-form-title">
          {editingId == null ? 'Novi događaj' : `Uređivanje događaja #${editingId}`}
        </h3>
        <p id="match-events-save-hint" className="match-event-save-hint muted">
          Tipka <strong>Sačuvaj</strong> šalje na server: jedan događaj iz forme (ili izmjenu ako
          uređuješ postojeći) i sve što je trenutno u <strong>radnoj verziji</strong> nasumičnih
          događaja. Iz golova se automatski računa rezultat; zakazan meč sa računatim rezultatom
          postaje <strong>završen</strong> da bi se tablica ažurirala.{' '}
          <strong>Nasumično popuni</strong> samo puni radnu verziju (6–13 valjanih događaja) —
          bez slanja dok ne klikneš Sačuvaj. Ako već imaš događaje na meču, pitat će za potvrdu.
        </p>
        {localError && (
          <p className="schedule-msg schedule-msg-error" role="alert">
            {localError}
          </p>
        )}
        {localOk && (
          <p className="schedule-msg schedule-msg-ok" role="status">
            {localOk}
          </p>
        )}
        <div className="match-event-form-grid">
          <label className="match-event-field">
            Minut (1–{REGULATION_MINUTES})
            <input
              type="number"
              min={1}
              max={REGULATION_MINUTES}
              value={minute}
              onChange={(e) => setMinute(e.target.value)}
              disabled={detailLoading || submitting}
              required
            />
          </label>
          <label className="match-event-field">
            Nadoknada (+n, 0–{MAX_MINUTE_ADDED}, prazno = nema)
            <input
              type="number"
              min={0}
              max={MAX_MINUTE_ADDED}
              value={minuteAdded}
              onChange={(e) => setMinuteAdded(e.target.value)}
              disabled={detailLoading || submitting}
              placeholder="npr. 2 za 45+2"
            />
          </label>
          <label className="match-event-field">
            Tip
            <select
              value={eventType}
              onChange={(e) =>
                setEventType(e.target.value as MatchEventType)
              }
              disabled={detailLoading || submitting}
            >
              {MATCH_EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {MATCH_EVENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="match-event-field">
            Tim
            <select
              value={teamId}
              onChange={(e) => setTeamId(Number(e.target.value))}
              disabled={detailLoading || submitting}
            >
              <option value={match.home_team_id}>
                Domaćin: {resolveTeam(match.home_team_id)}
              </option>
              <option value={match.away_team_id}>
                Gost: {resolveTeam(match.away_team_id)}
              </option>
            </select>
          </label>
          <label className="match-event-field">
            {substitution ? 'Izlazi' : 'Igrač'}
            <select
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              disabled={detailLoading || submitting}
            >
              <option value="">—</option>
              {squadOnTeam.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                  {p.shirt_number != null ? ` (#${p.shirt_number})` : ''}
                </option>
              ))}
            </select>
          </label>
          {substitution && (
            <label className="match-event-field">
              Ulazi
              <select
                value={relatedPlayerId}
                onChange={(e) => setRelatedPlayerId(e.target.value)}
                disabled={detailLoading || submitting}
              >
                <option value="">—</option>
                {squadOnTeam.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                    {p.shirt_number != null ? ` (#${p.shirt_number})` : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="match-event-field match-event-field--wide">
            Napomena (opcionalno)
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={detailLoading || submitting}
              maxLength={4000}
            />
          </label>
        </div>
        <div className="match-event-form-actions">
          <button
            type="submit"
            className="schedule-btn schedule-btn-primary"
            disabled={detailLoading || submitting}
            aria-describedby="match-events-save-hint"
          >
            {submitting ? 'Snimanje…' : 'Sačuvaj'}
          </button>
          <button
            type="button"
            className="schedule-btn schedule-btn-secondary"
            disabled={detailLoading || submitting}
            title="Dodaje 6–13 događaja u radnu verziju (bez servera dok ne klikneš Sačuvaj)."
            onClick={() => onRandomFill()}
          >
            Nasumično popuni
          </button>
          {pendingRandomEvents.length > 0 && (
            <button
              type="button"
              className="schedule-btn schedule-btn-muted"
              disabled={detailLoading || submitting}
              title="Ukloni sve iz radne verzije bez slanja na server."
              onClick={() => clearPendingRandom()}
            >
              Poništi radnu verziju
            </button>
          )}
          {editingId != null && (
            <button
              type="button"
              className="schedule-btn schedule-btn-muted"
              disabled={detailLoading || submitting}
              onClick={() => resetToNew()}
            >
              Odustani od uređivanja
            </button>
          )}
        </div>
      </form>

      <div className="section-body">
        {tableRows.length === 0 && !detailLoading && (
          <div className="section-body-plain">
            <p className="muted">
              Za ovaj meč još nema događaja — dodaj ih formom iznad ili nasumičnom radnom
              verzijom.
            </p>
          </div>
        )}
        {tableRows.length > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="numeric">Min</th>
                  <th>Tip</th>
                  <th>Tim</th>
                  <th>Igrač</th>
                  <th>Povezani</th>
                  <th>Napomena</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) =>
                  row.kind === 'server' ? (
                    <tr key={`s-${row.ev.id}`}>
                      <td className="numeric">
                        {row.ev.minute}
                        {row.ev.minute_added != null
                          ? `+${row.ev.minute_added}`
                          : ''}
                      </td>
                      <td>
                        <span className="status-chip">
                          {MATCH_EVENT_TYPE_LABELS[
                            row.ev.event_type as MatchEventType
                          ] ?? row.ev.event_type}
                        </span>
                      </td>
                      <td>
                        <TeamClubLink teamId={row.ev.team_id}>
                          {resolveTeam(row.ev.team_id)}
                        </TeamClubLink>
                      </td>
                      <td>
                        {row.ev.player_id != null ? (
                          <PlayerProfileLink playerId={row.ev.player_id}>
                            {playerNameById.get(row.ev.player_id) ??
                              `#${row.ev.player_id}`}
                          </PlayerProfileLink>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        {row.ev.related_player_id != null ? (
                          <PlayerProfileLink
                            playerId={row.ev.related_player_id}
                          >
                            {playerNameById.get(row.ev.related_player_id) ??
                              `#${row.ev.related_player_id}`}
                          </PlayerProfileLink>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="muted">{row.ev.notes ?? '—'}</td>
                      <td className="match-event-row-actions">
                        <button
                          type="button"
                          className="linkish-btn"
                          disabled={detailLoading || submitting}
                          onClick={() => loadEdit(row.ev)}
                        >
                          Uredi
                        </button>
                        <button
                          type="button"
                          className="linkish-btn linkish-btn--danger"
                          disabled={detailLoading || submitting}
                          onClick={() => void onDelete(row.ev.id)}
                        >
                          Obriši
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr
                      key={`p-${row.key}`}
                      className="match-event-row--pending"
                    >
                      <td className="numeric">
                        {row.body.minute}
                        {row.body.minute_added != null
                          ? `+${row.body.minute_added}`
                          : ''}
                      </td>
                      <td>
                        <span className="status-chip status-chip--draft">
                          {MATCH_EVENT_TYPE_LABELS[row.body.event_type] ??
                            row.body.event_type}
                        </span>
                      </td>
                      <td>
                        <TeamClubLink teamId={row.body.team_id}>
                          {resolveTeam(row.body.team_id)}
                        </TeamClubLink>
                      </td>
                      <td>
                        {row.body.player_id != null ? (
                          <PlayerProfileLink playerId={row.body.player_id}>
                            {playerNameById.get(row.body.player_id) ??
                              `#${row.body.player_id}`}
                          </PlayerProfileLink>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        {row.body.related_player_id != null ? (
                          <PlayerProfileLink
                            playerId={row.body.related_player_id}
                          >
                            {playerNameById.get(row.body.related_player_id) ??
                              `#${row.body.related_player_id}`}
                          </PlayerProfileLink>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="muted">{row.body.notes ?? '—'}</td>
                      <td className="match-event-row-actions">
                        <span className="muted match-event-draft-label">
                          Nacrt
                        </span>
                        <button
                          type="button"
                          className="linkish-btn linkish-btn--danger"
                          disabled={detailLoading || submitting}
                          onClick={() => removePendingRandom(row.key)}
                        >
                          Ukloni
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
