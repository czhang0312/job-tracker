import { useState } from 'react'
import type { JobApplication, AppStatus } from '../api'
import { StatusBadge, STATUS_META } from './StatusBadge'
import { fmtDate, toDateInputValue } from '../dates'

const STATUS_OPTIONS: AppStatus[] = ['applied', 'oa', 'interview', 'offer', 'rejected', 'other']

interface Props {
  application: JobApplication
  onClose: () => void
  onUpdate: (data: Partial<JobApplication>) => void
}

export function ApplicationModal({ application, onClose, onUpdate }: Props) {
  const [status, setStatus] = useState<AppStatus>(application.status)
  const [notes, setNotes] = useState(application.notes ?? '')
  const [appliedDate, setAppliedDate] = useState(toDateInputValue(application.applied_date))

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl border border-line shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-line">
          <h2 className="font-display text-lg font-bold tracking-tight text-ink">{application.company}</h2>
          <p className="text-mist text-sm mt-0.5">{application.role}</p>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-[0.12em] text-mist mb-2">Status</label>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    status === s
                      ? 'border-ink bg-ink text-white'
                      : 'border-line text-mist hover:text-ink hover:border-mist/40'
                  }`}
                >
                  {STATUS_META[s].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-[0.12em] text-mist mb-2">Applied date</label>
            <input
              type="date"
              className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-colors"
              value={appliedDate}
              onChange={(e) => setAppliedDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-[0.12em] text-mist mb-2">Notes</label>
            <textarea
              className="w-full border border-line rounded-lg px-3 py-2 text-sm resize-none placeholder:text-mist/70 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-colors"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes…"
            />
          </div>

          {application.events.length > 0 && (
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-[0.12em] text-mist mb-2">Email history</label>
              <div className="space-y-2">
                {application.events.map((ev) => (
                  <div key={ev.id} className="border border-line rounded-lg p-3 bg-paper/60">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={ev.status as AppStatus} />
                      <span className="font-mono text-[11px] text-mist">
                        {fmtDate(ev.detected_at)}
                      </span>
                    </div>
                    {ev.email_subject && <p className="text-xs text-ink mt-1.5 font-medium">{ev.email_subject}</p>}
                    {ev.email_snippet && <p className="text-xs text-mist mt-0.5 line-clamp-2">{ev.email_snippet}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-line flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-mist hover:text-ink transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onUpdate({ status, notes: notes || null, applied_date: appliedDate || null })}
            className="px-4 py-2 text-sm font-medium bg-ink text-white rounded-lg hover:bg-ink/85 transition-colors"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  )
}
