import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchApplications,
  fetchStats,
  createApplication,
  updateApplication,
  deleteApplication,
  type JobApplication,
} from './api'
import { StatsBar } from './components/StatsBar'
import { ApplicationTable } from './components/ApplicationTable'
import { AddApplicationForm } from './components/AddApplicationForm'
import { SyncPanel } from './components/SyncPanel'

function useToken() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('token')
    if (t) {
      localStorage.setItem('token', t)
      setToken(t)
      window.history.replaceState({}, '', '/')
    }
  }, [])

  return { token, logout: () => { localStorage.removeItem('token'); setToken(null) } }
}

export default function App() {
  const { token, logout } = useToken()
  const qc = useQueryClient()

  const apps = useQuery({ queryKey: ['applications'], queryFn: fetchApplications, enabled: !!token })
  const stats = useQuery({ queryKey: ['stats'], queryFn: fetchStats, enabled: !!token })

  const addApp = useMutation({
    mutationFn: createApplication,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['applications'] }); qc.invalidateQueries({ queryKey: ['stats'] }) },
  })

  const editApp = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<JobApplication> }) => updateApplication(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['applications'] }); qc.invalidateQueries({ queryKey: ['stats'] }) },
  })

  const removeApp = useMutation({
    mutationFn: deleteApplication,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['applications'] }); qc.invalidateQueries({ queryKey: ['stats'] }) },
  })

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Job Tracker</h1>
          <p className="text-gray-500 mb-8">Track your job applications automatically via Gmail</p>
          <a
            href="/auth/google"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors"
          >
            Sign in with Google
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Job Tracker</h1>
        <div className="flex items-center gap-3">
          <SyncPanel
            onComplete={() => {
              qc.invalidateQueries({ queryKey: ['applications'] })
              qc.invalidateQueries({ queryKey: ['stats'] })
            }}
          />
          <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {stats.data && <StatsBar stats={stats.data} />}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Applications</h2>
          <AddApplicationForm onAdd={(data) => addApp.mutate(data)} />
        </div>

        {apps.isLoading && <p className="text-gray-400 text-sm">Loading…</p>}
        {apps.data && (
          <ApplicationTable
            applications={apps.data}
            onUpdate={(id, data) => editApp.mutate({ id, data })}
            onDelete={(id) => removeApp.mutate(id)}
          />
        )}
      </main>
    </div>
  )
}
