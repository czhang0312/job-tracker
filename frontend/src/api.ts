import axios from 'axios'

export const api = axios.create({ baseURL: '/' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export type AppStatus = 'applied' | 'oa' | 'interview' | 'offer' | 'rejected' | 'other'

export interface StatusEvent {
  id: number
  status: AppStatus
  detected_at: string
  email_subject: string | null
  email_snippet: string | null
}

export interface JobApplication {
  id: number
  company: string
  role: string
  status: AppStatus
  applied_date: string | null
  updated_at: string
  notes: string | null
  job_url: string | null
  events: StatusEvent[]
}

export interface DashboardStats {
  total: number
  applied: number
  oa: number
  interview: number
  offer: number
  rejected: number
}

export interface SyncResult {
  emails_scanned: number
  new_applications: number
  updated_applications: number
}

export type SyncEvent =
  | { type: 'start'; total: number; after: string }
  | {
      type: 'email'
      index: number
      total: number
      result: 'new' | 'updated' | 'skipped' | 'not_job_related' | 'error'
      company: string | null
      role: string | null
      status: string | null
      subject: string | null
    }
  | { type: 'error'; message: string }
  | { type: 'done'; summary: SyncResult }

export async function syncGmailStream(
  params: { lookback_days?: number; after_date?: string },
  onEvent: (e: SyncEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch('/api/sync/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify(params),
    signal,
  })
  if (!res.ok || !res.body) throw new Error(`Sync failed (${res.status})`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line.trim()) onEvent(JSON.parse(line) as SyncEvent)
    }
  }
  if (buffer.trim()) onEvent(JSON.parse(buffer) as SyncEvent)
}

export const fetchApplications = () =>
  api.get<JobApplication[]>('/api/applications').then((r) => r.data)

export const fetchStats = () =>
  api.get<DashboardStats>('/api/stats').then((r) => r.data)

export const syncGmail = () =>
  api.post<SyncResult>('/api/sync').then((r) => r.data)

export const createApplication = (data: Partial<JobApplication>) =>
  api.post<JobApplication>('/api/applications', data).then((r) => r.data)

export const updateApplication = (id: number, data: Partial<JobApplication>) =>
  api.put<JobApplication>(`/api/applications/${id}`, data).then((r) => r.data)

export const deleteApplication = (id: number) =>
  api.delete(`/api/applications/${id}`)
