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
