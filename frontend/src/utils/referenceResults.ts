/** Normalizacija imena kluba za upoređivanje sa ručno zalijepljenom referencom. */
export function normalizeClubName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export type ReferenceRow = {
  round: number
  home: string
  away: string
  homeGoals: number
  awayGoals: number
}

function parseScorePair(
  raw: unknown,
): { homeGoals: number; awayGoals: number } | null {
  if (typeof raw !== 'string') return null
  const m = raw.trim().match(/^(\d+)\s*[:-]\s*(\d+)$/)
  if (!m) return null
  return { homeGoals: Number(m[1]), awayGoals: Number(m[2]) }
}

/** Parsira JSON niz objekata (fleksibilni ključevi bs/en). */
export function parseReferenceResultsJson(
  text: string,
): ReferenceRow[] | { error: string } {
  let data: unknown
  try {
    data = JSON.parse(text) as unknown
  } catch {
    return { error: 'JSON nije validan.' }
  }
  if (!Array.isArray(data)) {
    return { error: 'Očekuje se JSON niz (array) rezultata.' }
  }
  const out: ReferenceRow[] = []
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (!row || typeof row !== 'object') {
      return { error: `Stavka ${i + 1}: nije objekat.` }
    }
    const o = row as Record<string, unknown>
    const roundRaw =
      o.kolo ?? o.round ?? o.kr ?? o.runda ?? o.round_no ?? o.roundNo
    const round = Number(roundRaw)
    if (!Number.isFinite(round)) {
      return { error: `Stavka ${i + 1}: nedostaje ili je pogrešan broj kola.` }
    }
    const home = o.domacin ?? o.home ?? o.domaćin ?? o.host
    const away = o.gost ?? o.away ?? o.guest ?? o.visitor
    if (typeof home !== 'string' || typeof away !== 'string') {
      return {
        error: `Stavka ${i + 1}: trebaju polja za domaćina i gosta (npr. domacin / home).`,
      }
    }
    if (normalizeClubName(home) === normalizeClubName(away)) {
      return {
        error: `Stavka ${i + 1}: domaćin i gost moraju biti različiti klubovi.`,
      }
    }
    let homeGoals: number | undefined
    let awayGoals: number | undefined
    const hg =
      o.domacin_golovi ?? o.home_goals ?? o.hg ?? o.homeGoals ?? o.score_home
    const ag =
      o.gost_golovi ?? o.away_goals ?? o.ag ?? o.awayGoals ?? o.score_away
    if (hg != null && ag != null) {
      homeGoals = Number(hg)
      awayGoals = Number(ag)
    } else {
      const rez = o.rez ?? o.score ?? o.result ?? o.ft
      const pair = parseScorePair(rez)
      if (pair) {
        homeGoals = pair.homeGoals
        awayGoals = pair.awayGoals
      }
    }
    if (
      homeGoals === undefined ||
      awayGoals === undefined ||
      !Number.isFinite(homeGoals) ||
      !Number.isFinite(awayGoals)
    ) {
      return {
        error: `Stavka ${i + 1}: trebaju golovi (domacin_golovi/gost_golovi ili rez: "2:1").`,
      }
    }
    out.push({
      round,
      home: home.trim(),
      away: away.trim(),
      homeGoals,
      awayGoals,
    })
  }
  return out
}
