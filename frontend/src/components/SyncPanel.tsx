import { useRef, useState } from 'react'
import { syncGmailStream, type SyncEvent, type SyncResult } from '../api'
import { todayDateInputValue } from '../dates'

const PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
]

interface EmailLine {
  index: number
  text: string
  result: string
}

type SyncState =
  | { phase: 'idle' }
  | { phase: 'running'; index: number; total: number; recent: EmailLine[]; current: string }
  | { phase: 'done'; summary: SyncResult }
  | { phase: 'error'; message: string }

interface Props {
  onComplete: () => void
}

function describeEvent(e: Extract<SyncEvent, { type: 'email' }>): string {
  switch (e.result) {
    case 'new':
    case 'updated':
      return `${e.company} — ${e.status} (${e.result})`
    case 'not_job_related':
      return e.subject ? `not job-related: ${e.subject}` : 'not job-related'
    case 'skipped':
      return 'already processed'
    case 'error':
      return 'failed to process'
  }
}

export function SyncPanel({ onComplete }: Props) {
  const [state, setState] = useState<SyncState>({ phase: 'idle' })
  const [pickerOpen, setPickerOpen] = useState(false)
  const [customDate, setCustomDate] = useState(todayDateInputValue)
  const abortRef = useRef<AbortController | null>(null)

  const running = state.phase === 'running'

  const startScan = async (params: { lookback_days?: number; after_date?: string }) => {
    setPickerOpen(false)
    setState({ phase: 'running', index: 0, total: 0, recent: [], current: 'Starting scan…' })
    const controller = new AbortController()
    abortRef.current = controller

    try {
      await syncGmailStream(
        params,
        (e) => {
          if (e.type === 'start') {
            setState({ phase: 'running', index: 0, total: e.total, recent: [], current: `Found ${e.total} emails` })
          } else if (e.type === 'email') {
            const text = describeEvent(e)
            setState((prev) => {
              if (prev.phase !== 'running') return prev
              const recent =
                e.result === 'skipped' ? prev.recent : [{ index: e.index, text, result: e.result }, ...prev.recent].slice(0, 5)
              return { phase: 'running', index: e.index, total: e.total, recent, current: `Scanning ${e.index}/${e.total}: ${text}` }
            })
          } else if (e.type === 'done') {
            setState({ phase: 'done', summary: e.summary })
            setTimeout(() => setState((s) => (s.phase === 'done' ? { phase: 'idle' } : s)), 5000)
          } else if (e.type === 'error') {
            setState({ phase: 'error', message: e.message })
          }
        },
        controller.signal,
      )
    } catch (err) {
      if (controller.signal.aborted) {
        setState({ phase: 'idle' })
      } else {
        setState({ phase: 'error', message: err instanceof Error ? err.message : 'Sync failed' })
      }
    } finally {
      abortRef.current = null
      onComplete()
    }
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setPickerOpen((o) => !o)}
          disabled={running}
          className="px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent-deep disabled:opacity-50 transition-colors"
        >
          {running ? 'Syncing…' : 'Sync Gmail'}
        </button>

        {pickerOpen && !running && (
          <div className="absolute right-0 mt-2 w-56 bg-white border border-line rounded-xl shadow-lg z-20 p-3 space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-mist">Scan emails from</p>
            {PRESETS.map((p) => (
              <button
                key={p.days}
                onClick={() => startScan({ lookback_days: p.days })}
                className="w-full text-left px-3 py-1.5 text-sm text-ink rounded-lg hover:bg-paper transition-colors"
              >
                {p.label}
              </button>
            ))}
            <div className="border-t border-line pt-2 space-y-2">
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full border border-line rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-colors"
              />
              <button
                onClick={() => customDate && startScan({ after_date: customDate })}
                disabled={!customDate}
                className="w-full px-3 py-1.5 text-sm font-medium bg-ink text-white rounded-lg hover:bg-ink/85 disabled:opacity-40 transition-colors"
              >
                Scan from date
              </button>
            </div>
          </div>
        )}
      </div>

      {state.phase !== 'idle' && (
        <div className="fixed top-20 right-6 w-96 z-30">
          {state.phase === 'running' && (
            <div className="px-4 py-3 bg-white border border-line rounded-xl shadow-lg text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-ink">Syncing Gmail</span>
                <button
                  onClick={() => abortRef.current?.abort()}
                  className="text-xs text-mist hover:text-ink transition-colors"
                >
                  Cancel
                </button>
              </div>
              <div className="h-1.5 bg-paper rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all"
                  style={{ width: state.total ? `${(state.index / state.total) * 100}%` : '0%' }}
                />
              </div>
              <p className="text-mist truncate">{state.current}</p>
              {state.recent.length > 0 && (
                <div className="space-y-0.5">
                  {state.recent.map((line) => (
                    <p key={line.index} className="text-xs text-mist/70 truncate">
                      {line.text}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
          {state.phase === 'done' && (
            <div className="px-4 py-3 bg-[#E5F3EA] border border-[#2F7D52]/25 text-[#276A45] rounded-xl shadow-lg text-sm">
              Scanned {state.summary.emails_scanned} emails — {state.summary.new_applications} new,{' '}
              {state.summary.updated_applications} updated
            </div>
          )}
          {state.phase === 'error' && (
            <div className="px-4 py-3 bg-[#F9EAE8] border border-[#AE4A42]/25 text-[#993F38] rounded-xl shadow-lg text-sm flex items-start justify-between gap-3">
              <span>Sync failed: {state.message}</span>
              <button onClick={() => setState({ phase: 'idle' })} className="hover:text-ink transition-colors">
                ✕
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
