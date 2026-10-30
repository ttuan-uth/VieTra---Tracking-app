const VI_LOCALE = 'vi-VN'

export function toMs(value: string | number | Date): number {
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number') return value
  return new Date(value).getTime()
}

export function addHours(base: string | number | Date, hours: number): string {
  return new Date(toMs(base) + hours * 3_600_000).toISOString()
}

export function addDays(base: string | number | Date, days: number): string {
  return addHours(base, days * 24)
}

export function dateTimeLabel(value: string | number): string {
  const d = new Date(toMs(value))
  return new Intl.DateTimeFormat(VI_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}

export function dateLabel(value: string | number): string {
  const d = new Date(toMs(value))
  return new Intl.DateTimeFormat(VI_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

export function timeLabel(value: string | number): string {
  const d = new Date(toMs(value))
  return new Intl.DateTimeFormat(VI_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}

export function clockParts(value: string | number): { hours: number; minutes: number } {
  const d = new Date(toMs(value))
  return { hours: d.getHours(), minutes: d.getMinutes() }
}

export function durationLabel(minutes: number): string {
  const abs = Math.max(0, Math.round(Math.abs(minutes)))
  const days = Math.floor(abs / 1440)
  const hours = Math.floor((abs % 1440) / 60)
  const mins = abs % 60
  if (days > 0) return `${days} ngày ${hours} giờ`
  if (hours > 0) return `${hours} giờ ${mins > 0 ? `${mins} phút` : ''}`.trim()
  return `${mins} phút`
}

export function delayLabel(minutes: number): string {
  if (Math.abs(minutes) < 1) return 'đúng lịch'
  return `${minutes > 0 ? 'trễ' : 'sớm'} ${durationLabel(minutes)}`
}

export function diffMinutes(a: string | number, b: string | number): number {
  return Math.round((toMs(a) - toMs(b)) / 60_000)
}

export function startOfHour(value: string | number): number {
  const d = new Date(toMs(value))
  d.setMinutes(0, 0, 0)
  return d.getTime()
}

export function nowIso(): string {
  return new Date().toISOString()
}
