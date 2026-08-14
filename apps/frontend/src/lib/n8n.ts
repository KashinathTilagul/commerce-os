const WORKFLOW_ID = 'IF1CS5po1jkq9M7D'
const DEFAULT_EDITOR_URL = `https://kashinathtilagul.app.n8n.cloud/workflow/${WORKFLOW_ID}`

export function getN8nStatus() {
  return {
    configured: Boolean(process.env.N8N_EKVAAR_WEBHOOK_URL),
    workflowId: process.env.N8N_EKVAAR_WORKFLOW_ID || WORKFLOW_ID,
    editorUrl: process.env.N8N_EKVAAR_EDITOR_URL || DEFAULT_EDITOR_URL,
  }
}

export async function triggerEkvaarMarketing(input: Record<string, unknown> = {}) {
  const webhookUrl = process.env.N8N_EKVAAR_WEBHOOK_URL
  if (!webhookUrl) throw new Error('N8N_EKVAAR_WEBHOOK_URL is not configured')

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.N8N_EKVAAR_WEBHOOK_SECRET
        ? { 'x-ekvaar-secret': process.env.N8N_EKVAAR_WEBHOOK_SECRET }
        : {}),
    },
    body: JSON.stringify({ source: 'ekvaar-os', requestedAt: new Date().toISOString(), ...input }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })

  const text = await response.text()
  let payload: unknown = null
  try { payload = text ? JSON.parse(text) : null } catch { payload = text }
  if (!response.ok) throw new Error(`n8n returned ${response.status}`)
  return { accepted: true, status: response.status, payload }
}
