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
      <div className="min-h-screen flex items-center justify-center bg-paper px-4">
        <div className="text-center max-w-sm">
          <span className="inline-flex w-11 h-11 rounded-xl bg-accent text-white items-center justify-center font-display font-bold text-xl mb-5">
            J
          </span>
          <h1 className="font-display text-4xl font-bold tracking-tight text-ink mb-3">Job Tracker</h1>
          <p className="text-mist mb-9 leading-relaxed">
            Every application, every status change — pulled straight from your inbox.
          </p>
          <a
            href="/auth/google"
            className="inline-flex items-center gap-2 px-6 py-3 bg-ink text-white rounded-xl font-medium hover:bg-ink/85 transition-colors"
          >
            Continue with Google
          </a>
          <p className="font-mono text-[11px] text-mist/70 mt-8 uppercase tracking-[0.14em]">Read-only Gmail access</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-line px-6 py-3.5 flex items-center justify-between">
        <h1 className="flex items-center gap-2.5 font-display text-lg font-bold tracking-tight text-ink">
          <span className="inline-flex w-7 h-7 rounded-lg bg-accent text-white items-center justify-center text-sm">J</span>
          Job Tracker
        </h1>
        <div className="flex items-center gap-3">
          <SyncPanel
            onComplete={() => {
              qc.invalidateQueries({ queryKey: ['applications'] })
              qc.invalidateQueries({ queryKey: ['stats'] })
            }}
          />
          <button onClick={logout} className="text-sm text-mist hover:text-ink transition-colors">
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {stats.data && <StatsBar stats={stats.data} />}

        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <h2 className="font-display text-xl font-bold tracking-tight text-ink">Applications</h2>
          <AddApplicationForm onAdd={(data) => addApp.mutate(data)} />
        </div>

        {apps.isLoading && <p className="text-mist text-sm">Loading…</p>}
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
