import { apiGet } from './client'

export type HealthResponse = { status: string }

export function getHealth(): Promise<HealthResponse> {
  return apiGet<HealthResponse>('/health')
}
