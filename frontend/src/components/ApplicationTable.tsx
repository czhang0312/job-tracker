import { useState } from 'react'
import type { JobApplication, AppStatus } from '../api'
import { StatusBadge, STATUS_META } from './StatusBadge'
import { ApplicationModal } from './ApplicationModal'
import { fmtDate } from '../dates'

interface Props {
  applications: JobApplication[]
  onUpdate: (id: number, data: Partial<JobApplication>) => void
  onDelete: (id: number) => void
}

const STATUS_OPTIONS: AppStatus[] = ['applied', 'oa', 'interview', 'offer', 'rejected', 'other']

const MONOGRAM_TONES = [
  'bg-[#E9F0F6] text-[#3A6089]',
  'bg-[#F1EBF8] text-[#6B4C91]',
  'bg-[#F7EFDC] text-[#8F680F]',
  'bg-[#E5F3EA] text-[#276A45]',
  'bg-[#EEF1F4] text-[#64707D]',
]

function Monogram({ name }: { name: string }) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  const tone = MONOGRAM_TONES[Math.abs(hash) % MONOGRAM_TONES.length]
  return (
    <span
      className={`w-8 h-8 rounded-lg inline-flex items-center justify-center font-display font-bold text-sm shrink-0 ${tone}`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

export function ApplicationTable({ applications, onUpdate, onDelete }: Props) {
  const [filter, setFilter] = useState<AppStatus | 'all'>('all')
  const [selected, setSelected] = useState<JobApplication | null>(null)
  const [search, setSearch] = useState('')

  const visible = applications.filter((a) => {
    if (filter !== 'all' && a.status !== filter) return false
    if (search && !`${a.company} ${a.role}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const filtering = filter !== 'all' || search !== ''

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input
          type="text"
          placeholder="Search company or role…"
          className="bg-white border border-line rounded-lg px-3.5 py-2 text-sm flex-1 min-w-48 placeholder:text-mist/70 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-colors"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-1.5 flex-wrap">
          {(['all', ...STATUS_OPTIONS] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === s ? 'bg-ink text-white' : 'bg-white border border-line text-mist hover:text-ink hover:border-mist/40'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_META[s].label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-line overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-line">
              <th className="text-left px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] font-medium text-mist">Company</th>
              <th className="text-left px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em] font-medium text-mist">Role</th>
              <th className="text-left px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em] font-medium text-mist">Status</th>
              <th className="text-left px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em] font-medium text-mist">Applied</th>
              <th className="text-left px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em] font-medium text-mist">Updated</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-14 text-mist text-sm">
                  {filtering
                    ? 'No applications match your search or filter.'
                    : 'No applications yet — sync Gmail or add one manually.'}
                </td>
              </tr>
            )}
            {visible.map((app) => (
              <tr
                key={app.id}
                className="group hover:bg-paper/60 cursor-pointer transition-colors"
                onClick={() => setSelected(app)}
              >
                <td className="px-5 py-3.5">
                  <span className="flex items-center gap-3 font-medium text-ink">
                    <Monogram name={app.company} />
                    {app.company}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-mist">{app.role === 'Unknown' ? '—' : app.role}</td>
                <td className="px-4 py-3.5">
                  <StatusBadge status={app.status} />
                </td>
                <td className="px-4 py-3.5 font-mono text-[13px] text-mist whitespace-nowrap">{fmtDate(app.applied_date)}</td>
                <td className="px-4 py-3.5 font-mono text-[13px] text-mist whitespace-nowrap">{fmtDate(app.updated_at)}</td>
                <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onDelete(app.id)}
                    aria-label={`Delete ${app.company}`}
                    className="text-mist/0 group-hover:text-mist hover:!text-[#AE4A42] transition-colors text-xs font-medium"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <ApplicationModal
          application={selected}
          onClose={() => setSelected(null)}
          onUpdate={(data) => {
            onUpdate(selected.id, data)
            setSelected(null)
          }}
        />
      )}
    </div>
  )
}
