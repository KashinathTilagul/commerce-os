export function nextLaunchCode(existing: string[]) {
  const greatest = existing.reduce((max, code) => {
    const value = Number.parseInt(code.replace(/^LCH-/, ''), 10)
    return Number.isFinite(value) ? Math.max(max, value) : max
  }, 0)
  return `LCH-${String(greatest + 1).padStart(3, '0')}`
}
