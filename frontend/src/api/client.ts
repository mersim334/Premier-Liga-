import { API_BASE_URL } from '../config'

function joinUrl(base: string, path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base.replace(/\/$/, '')}${p}`
}

/** GET nad FastAPI rutom — očekuje JSON odgovor. */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(joinUrl(API_BASE_URL, path))
  if (!res.ok) {
    let detail = ''
    try {
      const body = await res.text()
      detail = body ? `: ${body.slice(0, 300)}` : ''
    } catch {
      /* ignore */
    }
    throw new Error(`HTTP ${res.status}${detail}`)
  }
  return res.json() as Promise<T>
}
