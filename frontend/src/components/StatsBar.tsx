import type { DashboardStats, AppStatus } from '../api'
import { STATUS_META } from './StatusBadge'

interface Props {
  stats: DashboardStats
}

const STAGES: { key: keyof DashboardStats & AppStatus }[] = [
  { key: 'applied' },
  { key: 'oa' },
  { key: 'interview' },
  { key: 'offer' },
  { key: 'rejected' },
]

export function StatsBar({ stats }: Props) {
  const staged = STAGES.map(({ key }) => ({ key, count: stats[key] }))
  const other = Math.max(0, stats.total - staged.reduce((s, x) => s + x.count, 0))
  const segments = [...staged, { key: 'other' as const, count: other }].filter((s) => s.count > 0)

  return (
    <section className="bg-white border border-line rounded-2xl px-6 py-5 mb-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-mist mb-3">Pipeline</p>

      <div className="flex items-end justify-between gap-6 flex-wrap mb-4">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display text-5xl font-bold tracking-tight leading-none">{stats.total}</span>
          <span className="text-sm text-mist">application{stats.total === 1 ? '' : 's'} tracked</span>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1.5">
          {[...staged, { key: 'other' as const, count: other }].map(({ key, count }) => (
            <span key={key} className="inline-flex items-center gap-1.5 text-xs text-mist">
              <span className={`w-2 h-2 rounded-sm ${STATUS_META[key].dot}`} />
              {STATUS_META[key].label}
              <span className="font-mono font-medium text-ink">{count}</span>
            </span>
          ))}
        </div>
      </div>

      {stats.total > 0 && (
        <div className="pipeline-grow flex h-2.5 rounded-full overflow-hidden gap-px">
          {segments.map(({ key, count }) => (
            <div
              key={key}
              className={`${STATUS_META[key].bar} first:rounded-l-full last:rounded-r-full`}
              style={{ width: `${(count / stats.total) * 100}%` }}
              title={`${STATUS_META[key].label}: ${count}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
