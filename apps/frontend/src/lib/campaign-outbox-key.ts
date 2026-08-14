export function campaignOutboxKey(aggregateId: string, eventType: string, version: number) {
  return `${eventType.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${aggregateId}-v${version}`
}
