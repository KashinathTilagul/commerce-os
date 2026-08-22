type JsonObject = Record<string, unknown>

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {}
}

function string(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

export function identifyComposioDelivery(rawPayload: unknown): {
  connectedAccountId: string | null
  userId: string | null
  triggerSlug: string | null
  eventType: string | null
} {
  const root = object(rawPayload)
  const metadata = object(root.metadata)
  const data = object(root.data)
  const eventType = string(root.type)
  return {
    connectedAccountId:
      string(metadata.connected_account_id) ||
      string(data.connection_id) ||
      string(root.connection_id) ||
      (eventType === 'composio.connected_account.expired' ? string(data.id) : null),
    userId: string(metadata.user_id) || string(data.user_id),
    triggerSlug: string(metadata.trigger_slug) || string(root.trigger_name),
    eventType,
  }
}

export function boundedEventPayload(value: unknown, maxLength = 65_536): string {
  const serialized = JSON.stringify(value)
  return serialized.length <= maxLength
    ? serialized
    : JSON.stringify({ truncated: true, preview: serialized.slice(0, maxLength) })
}
