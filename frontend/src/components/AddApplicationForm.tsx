import { useState } from 'react'
import type { JobApplication } from '../api'
import { todayDateInputValue } from '../dates'

interface Props {
  onAdd: (data: Partial<JobApplication>) => void
}

const inputClass =
  'bg-white border border-line rounded-lg px-3 py-1.5 text-sm placeholder:text-mist/70 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-colors'

export function AddApplicationForm({ onAdd }: Props) {
  const [open, setOpen] = useState(false)
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [jobUrl, setJobUrl] = useState('')
  const [appliedDate, setAppliedDate] = useState(todayDateInputValue)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!company || !role) return
    onAdd({ company, role, job_url: jobUrl || null, status: 'applied', applied_date: appliedDate || null })
    setCompany('')
    setRole('')
    setJobUrl('')
    setAppliedDate(todayDateInputValue())
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-ink text-white text-sm font-medium rounded-lg hover:bg-ink/85 transition-colors"
      >
        + Add application
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap gap-2 items-end">
      <input
        required
        placeholder="Company"
        className={inputClass}
        value={company}
        onChange={(e) => setCompany(e.target.value)}
      />
      <input required placeholder="Role" className={inputClass} value={role} onChange={(e) => setRole(e.target.value)} />
      <input
        placeholder="Job URL (optional)"
        className={inputClass}
        value={jobUrl}
        onChange={(e) => setJobUrl(e.target.value)}
      />
      <input
        type="date"
        className={inputClass}
        value={appliedDate}
        onChange={(e) => setAppliedDate(e.target.value)}
      />
      <button
        type="submit"
        className="px-4 py-1.5 bg-ink text-white text-sm font-medium rounded-lg hover:bg-ink/85 transition-colors"
      >
        Add
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="px-3 py-1.5 text-sm text-mist hover:text-ink transition-colors"
      >
        Cancel
      </button>
    </form>
  )
}
