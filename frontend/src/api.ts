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
