// Backend timestamps are stored in UTC but serialized without a timezone
// suffix (e.g. "2026-07-02T01:23:45"), so they must be parsed as UTC —
// new Date() alone would treat them as local time and shift the date.
export function parseUTC(value: string): Date {
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value)
  return new Date(hasTimezone ? value : value + 'Z')
}

// User-edited applied dates are stored as bare midnight — they represent a
// calendar date, not a moment in time, so they must not be timezone-shifted.
function isCalendarDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}(?:T00:00:00(?:\.0+)?)?$/.test(value)
}

export function fmtDate(value: string | null): string {
  if (!value) return '—'
  if (isCalendarDate(value)) {
    return parseUTC(value.slice(0, 10)).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    })
  }
  const d = parseUTC(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function toDateInputValue(value: string | null): string {
  if (!value) return ''
  if (isCalendarDate(value)) return value.slice(0, 10)
  const d = parseUTC(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
