import type { DashboardStats } from '../api'

interface Props {
  stats: DashboardStats
}

const ITEMS = [
  { key: 'total', label: 'Total', color: 'text-gray-900' },
  { key: 'applied', label: 'Applied', color: 'text-blue-600' },
  { key: 'oa', label: 'OA', color: 'text-purple-600' },
  { key: 'interview', label: 'Interview', color: 'text-yellow-600' },
  { key: 'offer', label: 'Offer', color: 'text-green-600' },
  { key: 'rejected', label: 'Rejected', color: 'text-red-600' },
] as const

export function StatsBar({ stats }: Props) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 mb-6">
      {ITEMS.map(({ key, label, color }) => (
        <div key={key} className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
          <div className={`text-2xl font-bold ${color}`}>{stats[key]}</div>
          <div className="text-xs text-gray-500 mt-1">{label}</div>
        </div>
      ))}
    </div>
  )
}
