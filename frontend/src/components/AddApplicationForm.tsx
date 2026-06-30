import { useState } from 'react'
import type { JobApplication } from '../api'

interface Props {
  onAdd: (data: Partial<JobApplication>) => void
}

export function AddApplicationForm({ onAdd }: Props) {
  const [open, setOpen] = useState(false)
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [jobUrl, setJobUrl] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!company || !role) return
    onAdd({ company, role, job_url: jobUrl || null, status: 'applied' })
    setCompany('')
    setRole('')
    setJobUrl('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
      >
        + Add Application
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap gap-2 items-end">
      <input
        required
        placeholder="Company"
        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
      />
      <input
        required
        placeholder="Role"
        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={role}
        onChange={(e) => setRole(e.target.value)}
      />
      <input
        placeholder="Job URL (optional)"
        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={jobUrl}
        onChange={(e) => setJobUrl(e.target.value)}
      />
      <button
        type="submit"
        className="px-4 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
      >
        Add
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        Cancel
      </button>
    </form>
  )
}
