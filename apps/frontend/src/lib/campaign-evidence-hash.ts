import { createHash } from 'node:crypto'

export function hashCampaignEvidence(evidence: unknown) {
  const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonical)
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => [key, canonical(entry)]))
    }
    return value
  }
  return createHash('sha256').update(JSON.stringify(canonical(evidence))).digest('hex')
}
