import { useState } from 'react'
import type { JobApplication, AppStatus } from '../api'
import { StatusBadge } from './StatusBadge'

const STATUS_OPTIONS: AppStatus[] = ['applied', 'oa', 'interview', 'offer', 'rejected', 'other']

interface Props {
  application: JobApplication
  onClose: () => void
  onUpdate: (data: Partial<JobApplication>) => void
}

function toDateInputValue(value: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

export function ApplicationModal({ application, onClose, onUpdate }: Props) {
  const [status, setStatus] = useState<AppStatus>(application.status)
  const [notes, setNotes] = useState(application.notes ?? '')
  const [appliedDate, setAppliedDate] = useState(toDateInputValue(application.applied_date))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{application.company}</h2>
          <p className="text-gray-500 text-sm mt-0.5">{application.role}</p>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    status === s ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Applied Date</label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={appliedDate}
              onChange={(e) => setAppliedDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Notes</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes…"
            />
          </div>

          {application.events.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Email History</label>
              <div className="space-y-2">
                {application.events.map((ev) => (
                  <div key={ev.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={ev.status as AppStatus} />
                      <span className="text-xs text-gray-400">{new Date(ev.detected_at).toLocaleDateString()}</span>
                    </div>
                    {ev.email_subject && (
                      <p className="text-xs text-gray-600 mt-1 font-medium">{ev.email_subject}</p>
                    )}
                    {ev.email_snippet && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{ev.email_snippet}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onUpdate({ status, notes: notes || null, applied_date: appliedDate || null })}
            className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
