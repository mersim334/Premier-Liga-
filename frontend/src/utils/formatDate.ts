export function formatDate(isoDate: string): string {
  try {
    const d = new Date(isoDate + 'T12:00:00')
    return d.toLocaleDateString('bs-BA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return isoDate
  }
}

/** Datum utakmice + opciono vrijeme početka (npr. za listu rezultata). */
export function formatMatchDateTime(
  matchDate: string,
  kickoffAt: string | null,
): string {
  const dateStr = formatDate(matchDate)
  if (kickoffAt == null || !String(kickoffAt).trim()) return dateStr
  try {
    const t = new Date(kickoffAt)
    if (Number.isNaN(t.getTime())) return dateStr
    const time = t.toLocaleTimeString('bs-BA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    return `${dateStr} ${time}`
  } catch {
    return dateStr
  }
}

/** Za naslove rasporeda (npr. „subota, 2. 8. 2025.”). */
export function formatDateWeekdayLong(isoDate: string): string {
  try {
    const d = new Date(isoDate + 'T12:00:00')
    return d.toLocaleDateString('bs-BA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return isoDate
  }
}
