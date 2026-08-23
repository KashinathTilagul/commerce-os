type KrishnaNodeResult = {
  spoken: string
  action: Record<string, unknown>
}

export function validKrishnaWebhookPath(path: string): boolean {
  return /^[A-Za-z0-9_-]{1,128}$/.test(path)
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function parseJsonText(value: string): unknown {
  const cleaned = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) return { spoken: cleaned, action: { type: 'none' } }
  return JSON.parse(cleaned.slice(start, end + 1))
}

export function parseKrishnaNodeResponse(raw: unknown): KrishnaNodeResult {
  const first = Array.isArray(raw) ? raw[0] : raw
  const envelope = object(first)
  const candidate = envelope.json ?? envelope.data ?? envelope.output ?? envelope.text ?? first
  const parsed = typeof candidate === 'string' ? parseJsonText(candidate) : candidate
  const response = object(parsed)
  const spoken = typeof response.spoken === 'string'
    ? response.spoken.trim()
    : typeof response.output === 'string'
      ? response.output.trim()
      : ''
  if (!spoken) throw new Error('The n8n LLM workflow returned no spoken response')
  const action = object(response.action)
  return { spoken, action: typeof action.type === 'string' ? action : { type: 'none' } }
}

export async function runKrishnaNodeWorkflow(input: {
  organizationId: string
  userId: string
  message: string
  system: string
  context: string
  webhookPath: string
}): Promise<KrishnaNodeResult> {
  if (!validKrishnaWebhookPath(input.webhookPath)) throw new Error('Invalid n8n webhook path')
  const baseUrl = process.env.N8N_INTERNAL_WEBHOOK_URL?.replace(/\/$/, '')
  const secret = process.env.N8N_EKVAAR_WEBHOOK_SECRET
  if (!baseUrl || !secret) throw new Error('The internal n8n node router is not configured')

  const response = await fetch(`${baseUrl}/${input.webhookPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-ekvaar-secret': secret,
    },
    body: JSON.stringify({
      chatInput: input.message,
      message: input.message,
      system: input.system,
      context: input.context,
      organizationId: input.organizationId,
      userId: input.userId,
      responseContract: {
        spoken: 'Natural TTS-ready reply',
        action: { type: 'none' },
      },
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(6_000),
  })
  if (!response.ok) throw new Error(`n8n LLM workflow returned ${response.status}`)
  return parseKrishnaNodeResponse(await response.json())
}
