import { useState } from 'react'
import type { JobApplication, AppStatus } from '../api'
import { StatusBadge } from './StatusBadge'
import { ApplicationModal } from './ApplicationModal'

interface Props {
  applications: JobApplication[]
  onUpdate: (id: number, data: Partial<JobApplication>) => void
  onDelete: (id: number) => void
}

const STATUS_OPTIONS: AppStatus[] = ['applied', 'oa', 'interview', 'offer', 'rejected', 'other']

export function ApplicationTable({ applications, onUpdate, onDelete }: Props) {
  const [filter, setFilter] = useState<AppStatus | 'all'>('all')
  const [selected, setSelected] = useState<JobApplication | null>(null)
  const [search, setSearch] = useState('')

  const visible = applications.filter((a) => {
    if (filter !== 'all' && a.status !== filter) return false
    if (search && !`${a.company} ${a.role}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input
          type="text"
          placeholder="Search company or role…"
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-2 flex-wrap">
          {(['all', ...STATUS_OPTIONS] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === s
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Company</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Applied</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Updated</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400">No applications found</td>
              </tr>
            )}
            {visible.map((app) => (
              <tr
                key={app.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelected(app)}
              >
                <td className="px-4 py-3 font-medium text-gray-900">{app.company}</td>
                <td className="px-4 py-3 text-gray-600">{app.role}</td>
                <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
                <td className="px-4 py-3 text-gray-500">
                  {app.applied_date ? new Date(app.applied_date).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(app.updated_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onDelete(app.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors text-xs"
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
          onUpdate={(data) => { onUpdate(selected.id, data); setSelected(null) }}
        />
      )}
    </div>
  )
}
