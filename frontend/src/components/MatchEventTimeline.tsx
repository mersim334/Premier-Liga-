import { useMemo, type ReactNode } from 'react'

import type { MatchRow } from '../api/matches'
import type { MatchEventRow } from '../api/match-events'
import { MATCH_EVENT_TYPE_LABELS } from '../api/match-events'
import { HALF_DURATION_MINUTES } from '../domain/football'

/** Npr. „Perić K.” — prezime + inicijal imena. */
export function formatPlayerShort(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]!
  const last = parts[parts.length - 1]!
  const firstInitial = parts[0]!.charAt(0).toLocaleUpperCase('bs-BA')
  return `${last} ${firstInitial}.`
}

function compareEventsChronological(a: MatchEventRow, b: MatchEventRow): number {
  const ma = a.minute - b.minute
  if (ma !== 0) return ma
  const aa = a.minute_added ?? -1
  const ba = b.minute_added ?? -1
  if (aa !== ba) return aa - ba
  return a.id - b.id
}

function isFirstHalf(ev: MatchEventRow): boolean {
  return ev.minute <= HALF_DURATION_MINUTES
}

/** Golovi samo u tom poluvremenu (za naslov trake, kao na referentnom UI-u). */
function halfGoalTally(
  sorted: MatchEventRow[],
  half: 1 | 2,
  homeId: number,
  awayId: number,
): { home: number; away: number } {
  let home = 0
  let away = 0
  for (const ev of sorted) {
    const inHalf = half === 1 ? isFirstHalf(ev) : !isFirstHalf(ev)
    if (!inHalf) continue
    if (ev.event_type === 'goal' || ev.event_type === 'penalty_scored') {
      if (ev.team_id === homeId) home++
      else if (ev.team_id === awayId) away++
    } else if (ev.event_type === 'own_goal') {
      if (ev.team_id === homeId) away++
      else if (ev.team_id === awayId) home++
    }
  }
  return { home, away }
}

function formatEventMinute(ev: MatchEventRow): string {
  if (ev.minute_added != null && ev.minute_added > 0) {
    return `${ev.minute}+${ev.minute_added}'`
  }
  return `${ev.minute}'`
}

type Props = {
  match: MatchRow
  events: MatchEventRow[]
  playerNameById: Map<number, string>
}

export function MatchEventTimeline({ match, events, playerNameById }: Props) {
  const sorted = useMemo(
    () => [...events].sort(compareEventsChronological),
    [events],
  )

  const { firstHalf, secondHalf } = useMemo(() => {
    const f: MatchEventRow[] = []
    const s: MatchEventRow[] = []
    for (const ev of sorted) {
      if (isFirstHalf(ev)) f.push(ev)
      else s.push(ev)
    }
    return { firstHalf: f, secondHalf: s }
  }, [sorted])

  const score1 = useMemo(
    () => halfGoalTally(sorted, 1, match.home_team_id, match.away_team_id),
    [sorted, match.home_team_id, match.away_team_id],
  )
  const score2 = useMemo(
    () => halfGoalTally(sorted, 2, match.home_team_id, match.away_team_id),
    [sorted, match.home_team_id, match.away_team_id],
  )

  const cumulativeAfterEvent = useMemo(() => {
    const map = new Map<number, { home: number; away: number }>()
    let home = 0
    let away = 0
    for (const ev of sorted) {
      if (ev.event_type === 'goal' || ev.event_type === 'penalty_scored') {
        if (ev.team_id === match.home_team_id) home++
        else if (ev.team_id === match.away_team_id) away++
      } else if (ev.event_type === 'own_goal') {
        if (ev.team_id === match.home_team_id) away++
        else if (ev.team_id === match.away_team_id) home++
      }
      if (
        ev.event_type === 'goal' ||
        ev.event_type === 'penalty_scored' ||
        ev.event_type === 'own_goal'
      ) {
        map.set(ev.id, { home, away })
      }
    }
    return map
  }, [sorted, match.home_team_id, match.away_team_id])

  const resolvePlayer = (id: number | null) => {
    if (id == null) return '—'
    return (
      playerNameById.get(id) ?? `#${id}`
    )
  }

  if (sorted.length === 0) {
    return (
      <div className="match-timeline match-timeline--empty">
        <p className="muted">
          Još nema događaja na ovom meču. Unesi ih u kartici{' '}
          <strong>Događaji</strong>.
        </p>
      </div>
    )
  }

  return (
    <div className="match-timeline" aria-label="Hronologija događaja">
      <HalfBlock
        title="1. poluvrijeme"
        scoreHome={score1.home}
        scoreAway={score1.away}
        list={firstHalf}
        match={match}
        cumulativeAfterEvent={cumulativeAfterEvent}
        resolvePlayer={resolvePlayer}
      />
      <HalfBlock
        title="2. poluvrijeme"
        scoreHome={score2.home}
        scoreAway={score2.away}
        list={secondHalf}
        match={match}
        cumulativeAfterEvent={cumulativeAfterEvent}
        resolvePlayer={resolvePlayer}
      />
    </div>
  )
}

function HalfBlock({
  title,
  scoreHome,
  scoreAway,
  list,
  match,
  cumulativeAfterEvent,
  resolvePlayer,
}: {
  title: string
  scoreHome: number
  scoreAway: number
  list: MatchEventRow[]
  match: MatchRow
  cumulativeAfterEvent: Map<number, { home: number; away: number }>
  resolvePlayer: (id: number | null) => string
}) {
  return (
    <section className="match-timeline-half">
      <header className="match-timeline-half-bar">
        <span className="match-timeline-half-title">{title}</span>
        <span className="match-timeline-half-score">
          {scoreHome} – {scoreAway}
        </span>
      </header>
      {list.length === 0 ? (
        <p className="match-timeline-half-empty muted">
          Nema događaja u ovom poluvremenu.
        </p>
      ) : (
        <ul className="match-timeline-list">
          {list.map((ev) => (
            <TimelineRow
              key={ev.id}
              ev={ev}
              match={match}
              cumulativeAfterEvent={cumulativeAfterEvent}
              resolvePlayer={resolvePlayer}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function TimelineRow({
  ev,
  match,
  cumulativeAfterEvent,
  resolvePlayer,
}: {
  ev: MatchEventRow
  match: MatchRow
  cumulativeAfterEvent: Map<number, { home: number; away: number }>
  resolvePlayer: (id: number | null) => string
}) {
  const isHome = ev.team_id === match.home_team_id
  const cum = cumulativeAfterEvent.get(ev.id)
  const minStr = formatEventMinute(ev)

  const primaryName = formatPlayerShort(resolvePlayer(ev.player_id))
  const relatedName = formatPlayerShort(resolvePlayer(ev.related_player_id))

  let main: ReactNode
  if (ev.event_type === 'substitution') {
    main = (
      <div className="match-timeline-text">
        <span className="match-timeline-sub-in">{relatedName}</span>
        <span className="match-timeline-sub-out muted">
          {formatPlayerShort(resolvePlayer(ev.player_id))}
        </span>
      </div>
    )
  } else if (
    ev.event_type === 'penalty_missed' ||
    ev.event_type === 'yellow_card' ||
    ev.event_type === 'red_card'
  ) {
    main = <span className="match-timeline-player">{primaryName}</span>
  } else {
    main = <span className="match-timeline-player">{primaryName}</span>
  }

  const icon = (
    <span
      className="match-timeline-icon-wrap"
      title={MATCH_EVENT_TYPE_LABELS[ev.event_type as keyof typeof MATCH_EVENT_TYPE_LABELS] ?? ev.event_type}
    >
      <EventGlyph type={ev.event_type} />
    </span>
  )

  const scorePill =
    cum != null ? (
      <span className="match-timeline-score-pill">
        {cum.home} – {cum.away}
      </span>
    ) : null

  if (isHome) {
    return (
      <li className="match-timeline-row match-timeline-row--home">
        <span className="match-timeline-min">{minStr}</span>
        {icon}
        <div className="match-timeline-main">
          {main}
          {scorePill}
        </div>
      </li>
    )
  }

  return (
    <li className="match-timeline-row match-timeline-row--away">
      <div className="match-timeline-main">
        {main}
        {scorePill}
      </div>
      {icon}
      <span className="match-timeline-min">{minStr}</span>
    </li>
  )
}

function EventGlyph({ type }: { type: string }) {
  switch (type) {
    case 'goal':
    case 'penalty_scored':
      return <span className="match-timeline-glyph match-timeline-glyph--ball" aria-hidden>⚽</span>
    case 'own_goal':
      return (
        <span
          className="match-timeline-glyph match-timeline-glyph--ball match-timeline-glyph--og"
          aria-hidden
          title="Autogol"
        >
          ⚽
        </span>
      )
    case 'penalty_missed':
      return (
        <span className="match-timeline-glyph match-timeline-glyph--miss" aria-hidden title="Promašen penal">
          ⨯
        </span>
      )
    case 'substitution':
      return (
        <span className="match-timeline-glyph match-timeline-glyph--sub" aria-hidden>
          ⇄
        </span>
      )
    case 'yellow_card':
      return <span className="match-timeline-card match-timeline-card--yellow" aria-hidden />
    case 'red_card':
      return <span className="match-timeline-card match-timeline-card--red" aria-hidden />
    default:
      return <span className="match-timeline-glyph" aria-hidden>•</span>
  }
}
