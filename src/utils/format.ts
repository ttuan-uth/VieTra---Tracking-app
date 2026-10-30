const vnd = new Intl.NumberFormat('vi-VN', {
  style: 'decimal',
  maximumFractionDigits: 0,
})

export function formatVnd(value: number): string {
  return `${vnd.format(Math.round(value))} VND`
}

export function formatMoney(value: number, currency: string): string {
  if (currency === 'VND') return formatVnd(value)
  const formatted = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(
    Math.round(value),
  )
  return `${formatted} ${currency}`
}

export function formatKg(value: number): string {
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value)} kg`
}

export function formatVolume(value: number): string {
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value)} m³`
}

export function lineVolumeM3(line: {
  quantity: number
  lengthCm: number
  widthCm: number
  heightCm: number
}): number {
  const perUnit = (line.lengthCm * line.widthCm * line.heightCm) / 1_000_000
  return perUnit * line.quantity
}

export function totalVolume(lines: Array<Parameters<typeof lineVolumeM3>[0]>): number {
  return lines.reduce((sum, line) => sum + lineVolumeM3(line), 0)
}

export function totalWeight(lines: Array<{ weightKg: number; quantity: number }>): number {
  return lines.reduce((sum, line) => sum + line.weightKg * line.quantity, 0)
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}
