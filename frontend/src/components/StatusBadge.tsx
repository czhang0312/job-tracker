import type { AppStatus } from '../api'

const COLORS: Record<AppStatus, string> = {
  applied: 'bg-blue-100 text-blue-800',
  oa: 'bg-purple-100 text-purple-800',
  interview: 'bg-yellow-100 text-yellow-800',
  offer: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  other: 'bg-gray-100 text-gray-700',
}

const LABELS: Record<AppStatus, string> = {
  applied: 'Applied',
  oa: 'OA',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
  other: 'Other',
}

export function StatusBadge({ status }: { status: AppStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${COLORS[status]}`}>
      {LABELS[status]}
    </span>
  )
}
