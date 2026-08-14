// Shared formatting and display constants.

export function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR', 
    notation: 'compact',
    compactDisplay: 'short'
  }).format(n)
}

export function formatINRFull(n: number): string {
  return new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR' 
  }).format(n)
}

export function timeAgo(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return '—'
  
  const diff = (Date.now() - d.getTime()) / 1000
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  
  for (const [unit, seconds] of units) {
    const value = Math.round(diff / seconds)
    if (Math.abs(value) >= 1) return rtf.format(-value, unit)
  }
  
  return rtf.format(0, 'second')
}
