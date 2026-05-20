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

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(joinUrl(API_BASE_URL, path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    let detail = ''
    try {
      const t = await res.text()
      detail = t ? `: ${t.slice(0, 400)}` : ''
    } catch {
      /* ignore */
    }
    throw new Error(`HTTP ${res.status}${detail}`)
  }
  return res.json() as Promise<T>
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(joinUrl(API_BASE_URL, path), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    let detail = ''
    try {
      const t = await res.text()
      detail = t ? `: ${t.slice(0, 400)}` : ''
    } catch {
      /* ignore */
    }
    throw new Error(`HTTP ${res.status}${detail}`)
  }
  return res.json() as Promise<T>
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(joinUrl(API_BASE_URL, path), { method: 'DELETE' })
  if (!res.ok) {
    let detail = ''
    try {
      const t = await res.text()
      detail = t ? `: ${t.slice(0, 400)}` : ''
    } catch {
      /* ignore */
    }
    throw new Error(`HTTP ${res.status}${detail}`)
  }
}
