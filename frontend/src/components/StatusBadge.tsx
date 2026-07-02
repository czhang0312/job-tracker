import type { AppStatus } from '../api'

export const STATUS_META: Record<AppStatus, { label: string; dot: string; text: string; bar: string }> = {
  applied: { label: 'Applied', dot: 'bg-[#46739E]', text: 'text-[#3A6089]', bar: 'bg-[#46739E]' },
  oa: { label: 'OA', dot: 'bg-[#7D5BA6]', text: 'text-[#6B4C91]', bar: 'bg-[#7D5BA6]' },
  interview: { label: 'Interview', dot: 'bg-[#B08018]', text: 'text-[#8F680F]', bar: 'bg-[#B08018]' },
  offer: { label: 'Offer', dot: 'bg-[#2F7D52]', text: 'text-[#276A45]', bar: 'bg-[#2F7D52]' },
  rejected: { label: 'Rejected', dot: 'bg-[#AE4A42]', text: 'text-[#993F38]', bar: 'bg-[#AE4A42]' },
  other: { label: 'Other', dot: 'bg-[#8B95A1]', text: 'text-[#64707D]', bar: 'bg-[#8B95A1]' },
}

export function StatusBadge({ status }: { status: AppStatus }) {
  const meta = STATUS_META[status]
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${meta.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}
