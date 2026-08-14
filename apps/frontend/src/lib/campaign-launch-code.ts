export function nextCampaignLaunchCode(existing: string[]) {
  const greatest = existing.reduce((max, code) => {
    const value = Number.parseInt(code.replace(/^CL-/, ''), 10)
    return Number.isFinite(value) ? Math.max(max, value) : max
  }, 0)
  return `CL-${String(greatest + 1).padStart(3, '0')}`
}
