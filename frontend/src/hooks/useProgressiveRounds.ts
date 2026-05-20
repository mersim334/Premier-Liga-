import { useCallback, useEffect, useMemo, useState } from 'react'

import type { MatchRow } from '../api/matches'

export type UseProgressiveRoundsOptions = {
  /** Npr. selectedSeasonId — resetuje prikaz na prvi blok kola */
  resetKey?: string | number | null
  /** Broj kola po koraku (podrazumijevano 1) */
  chunkSize?: number
  /** Kad je false, vraća cijeli sorted bez ograničenja */
  enabled?: boolean
}

/**
 * Ograničava prikaz utakmica na prva N kola (u blokovima od chunkSize),
 * uz showMore za sljedeći blok. Podaci su već u memoriji — radi se samo o prikazu.
 */
export function useProgressiveRounds(
  matchesSorted: MatchRow[],
  {
    resetKey,
    chunkSize = 1,
    enabled = true,
  }: UseProgressiveRoundsOptions = {},
) {
  const roundNumbers = useMemo(() => {
    const s = new Set<number>()
    for (const m of matchesSorted) {
      if (m.round_no != null) s.add(m.round_no)
    }
    return [...s].sort((a, b) => a - b)
  }, [matchesSorted])

  const chunks = useMemo(() => {
    const out: number[][] = []
    for (let i = 0; i < roundNumbers.length; i += chunkSize) {
      out.push(roundNumbers.slice(i, i + chunkSize))
    }
    return out
  }, [roundNumbers, chunkSize])

  const [visibleChunkCount, setVisibleChunkCount] = useState(1)

  useEffect(() => {
    setVisibleChunkCount(1)
  }, [resetKey, roundNumbers.join('|')])

  const allowedRounds = useMemo(() => {
    if (!enabled) return null
    const flat = chunks.slice(0, visibleChunkCount).flat()
    return new Set(flat)
  }, [chunks, visibleChunkCount, enabled])

  const displayedMatches = useMemo(() => {
    if (!enabled || allowedRounds == null) return matchesSorted
    return matchesSorted.filter(
      (m) => m.round_no != null && allowedRounds.has(m.round_no),
    )
  }, [matchesSorted, allowedRounds, enabled])

  const canShowMore = enabled && visibleChunkCount < chunks.length
  const canShowLess = enabled && visibleChunkCount > 1

  const showMore = useCallback(() => {
    setVisibleChunkCount((c) => Math.min(c + 1, chunks.length))
  }, [chunks.length])

  const showLess = useCallback(() => {
    setVisibleChunkCount((c) => Math.max(c - 1, 1))
  }, [])

  const nextChunkLabel = useMemo(() => {
    if (!canShowMore) return null
    const next = chunks[visibleChunkCount]
    if (!next?.length) return null
    const a = next[0]!
    const b = next[next.length - 1]!
    return a === b ? `kolo ${a}` : `kola ${a}–${b}`
  }, [canShowMore, chunks, visibleChunkCount])

  /** Kola koja će nestati sa liste nakon „Prikaži manje”. */
  const prevChunkLabel = useMemo(() => {
    if (!canShowLess) return null
    const hiding = chunks[visibleChunkCount - 1]
    if (!hiding?.length) return null
    const a = hiding[0]!
    const b = hiding[hiding.length - 1]!
    return a === b ? `kolo ${a}` : `kola ${a}–${b}`
  }, [canShowLess, chunks, visibleChunkCount])

  return {
    displayedMatches,
    canShowMore,
    showMore,
    canShowLess,
    showLess,
    nextChunkLabel,
    prevChunkLabel,
  }
}
