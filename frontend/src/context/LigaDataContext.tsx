import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react'

import { getHealth } from '../api/health'
import type { MatchEventRow } from '../api/match-events'
import { getMatchEvents } from '../api/match-events'
import type { MatchRow } from '../api/matches'
import { getMatches } from '../api/matches'
import type { PlayerRow } from '../api/players'
import { getPlayers } from '../api/players'
import type { SeasonRow } from '../api/seasons'
import { getSeasons } from '../api/seasons'
import type { TeamRow } from '../api/teams'
import { getTeams } from '../api/teams'
import { formatDate } from '../utils/formatDate'

export type LigaDataContextValue = {
  health: string | null
  seasons: SeasonRow[]
  teams: TeamRow[]
  matches: MatchRow[]
  players: PlayerRow[]
  matchEvents: MatchEventRow[]
  selectedSeasonId: number | null
  selectedMatchId: number | null
  loading: boolean
  detailLoading: boolean
  error: string | null
  resolveTeam: (id: number) => string
  playerNameById: Map<number, string>
  selectedMatchLabel: (row: MatchRow) => string
  onSeasonChange: (e: ChangeEvent<HTMLSelectElement>) => Promise<void>
  onMatchChange: (e: ChangeEvent<HTMLSelectElement>) => Promise<void>
}

const LigaDataContext = createContext<LigaDataContextValue | null>(null)

export function LigaDataProvider({ children }: { children: ReactNode }) {
  const [health, setHealth] = useState<string | null>(null)
  const [seasons, setSeasons] = useState<SeasonRow[]>([])
  const [teams, setTeams] = useState<TeamRow[]>([])
  const [matches, setMatches] = useState<MatchRow[]>([])
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [matchEvents, setMatchEvents] = useState<MatchEventRow[]>([])

  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null)
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null)

  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const teamNameById = useMemo(() => {
    const m = new Map<number, string>()
    for (const t of teams) m.set(t.id, t.name)
    return m
  }, [teams])

  const resolveTeam = useCallback(
    (id: number) => teamNameById.get(id) ?? `Tim #${id}`,
    [teamNameById],
  )

  const playerNameById = useMemo(() => {
    const m = new Map<number, string>()
    for (const p of players) m.set(p.id, p.full_name)
    return m
  }, [players])

  const loadSeasonBundle = useCallback(async (seasonId: number) => {
    setDetailLoading(true)
    try {
      const [m, p] = await Promise.all([
        getMatches(seasonId),
        getPlayers({ season_id: seasonId }),
      ])
      setMatches(m)
      setPlayers(p)

      const firstMid = m[0]?.id ?? null
      setSelectedMatchId(firstMid)
      if (firstMid != null) {
        const ev = await getMatchEvents(firstMid)
        setMatchEvents(ev)
      } else {
        setMatchEvents([])
      }
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [h, seasonList, teamList] = await Promise.all([
          getHealth(),
          getSeasons(),
          getTeams(),
        ])
        if (cancelled) return
        setHealth(h.status)
        setSeasons(seasonList)
        setTeams(teamList)

        const defaultSeasonId =
          seasonList.find((s) => s.is_current)?.id ?? seasonList[0]?.id ?? null
        setSelectedSeasonId(defaultSeasonId)

        if (defaultSeasonId != null) {
          setDetailLoading(true)
          try {
            const [m, p] = await Promise.all([
              getMatches(defaultSeasonId),
              getPlayers({ season_id: defaultSeasonId }),
            ])
            if (cancelled) return
            setMatches(m)
            setPlayers(p)
            const firstMid = m[0]?.id ?? null
            setSelectedMatchId(firstMid)
            if (firstMid != null) {
              const ev = await getMatchEvents(firstMid)
              if (!cancelled) setMatchEvents(ev)
            } else {
              setMatchEvents([])
            }
          } finally {
            if (!cancelled) setDetailLoading(false)
          }
        } else {
          setMatches([])
          setPlayers([])
          setMatchEvents([])
        }
      } catch (e) {
        if (cancelled) return
        const msg =
          e instanceof Error ? e.message : 'Nepoznata greška pri učitavanju'
        setError(msg)
        setHealth(null)
        setSeasons([])
        setTeams([])
        setMatches([])
        setPlayers([])
        setMatchEvents([])
        setSelectedSeasonId(null)
        setSelectedMatchId(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const onSeasonChange = useCallback(
    async (e: ChangeEvent<HTMLSelectElement>) => {
      const id = Number(e.target.value)
      if (Number.isNaN(id)) return
      setSelectedSeasonId(id)
      try {
        await loadSeasonBundle(id)
        setError(null)
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Neuspjelo učitavanje podataka za sezonu'
        setError(msg)
      }
    },
    [loadSeasonBundle],
  )

  const onMatchChange = useCallback(
    async (e: ChangeEvent<HTMLSelectElement>) => {
      const id = Number(e.target.value)
      if (Number.isNaN(id)) return
      setSelectedMatchId(id)
      setDetailLoading(true)
      try {
        const ev = await getMatchEvents(id)
        setMatchEvents(ev)
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Neuspjelo učitavanje događaja'
        setError(msg)
      } finally {
        setDetailLoading(false)
      }
    },
    [],
  )

  const selectedMatchLabel = useCallback(
    (row: MatchRow) =>
      `${formatDate(row.match_date)} · ${resolveTeam(row.home_team_id)} — ${resolveTeam(row.away_team_id)}`,
    [resolveTeam],
  )

  const value = useMemo<LigaDataContextValue>(
    () => ({
      health,
      seasons,
      teams,
      matches,
      players,
      matchEvents,
      selectedSeasonId,
      selectedMatchId,
      loading,
      detailLoading,
      error,
      resolveTeam,
      playerNameById,
      selectedMatchLabel,
      onSeasonChange,
      onMatchChange,
    }),
    [
      health,
      seasons,
      teams,
      matches,
      players,
      matchEvents,
      selectedSeasonId,
      selectedMatchId,
      loading,
      detailLoading,
      error,
      resolveTeam,
      playerNameById,
      selectedMatchLabel,
      onSeasonChange,
      onMatchChange,
    ],
  )

  return (
    <LigaDataContext.Provider value={value}>
      {children}
    </LigaDataContext.Provider>
  )
}

export function useLigaData(): LigaDataContextValue {
  const ctx = useContext(LigaDataContext)
  if (!ctx) {
    throw new Error('useLigaData mora biti unutar LigaDataProvider')
  }
  return ctx
}
