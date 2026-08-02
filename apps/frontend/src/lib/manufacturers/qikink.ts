const QIKINK_LIVE_URL = 'https://api.qikink.com'
const QIKINK_SANDBOX_URL = 'https://sandbox.qikink.com'

export type QikinkMode = 'live' | 'sandbox'

export function qikinkConfig() {
  const mode = (process.env.QIKINK_MODE === 'live' ? 'live' : 'sandbox') as QikinkMode
  return {
    mode,
    baseUrl: mode === 'live' ? QIKINK_LIVE_URL : QIKINK_SANDBOX_URL,
    clientId: process.env.QIKINK_CLIENT_ID || '',
    clientSecret: process.env.QIKINK_CLIENT_SECRET || '',
  }
}

export async function getQikinkToken() {
  const config = qikinkConfig()
  if (!config.clientId || !config.clientSecret) {
    return { ok: false as const, error: 'QIKINK_CLIENT_ID and QIKINK_CLIENT_SECRET are not configured.' }
  }

  const body = new URLSearchParams()
  body.set('ClientId', config.clientId)
  body.set('client_secret', config.clientSecret)

  const response = await fetch(`${config.baseUrl}/api/token`, {
    method: 'POST',
    body,
    signal: AbortSignal.timeout(15000),
  })
  const data = await response.json().catch(() => ({}))
  const token = data.Accesstoken || data.access_token || data.token

  if (!response.ok || !token) {
    return { ok: false as const, error: data.error || data.message || `Qikink auth failed with ${response.status}` }
  }

  return { ok: true as const, token: String(token), expiresIn: data.expires_in, clientId: config.clientId, baseUrl: config.baseUrl, mode: config.mode }
}

export async function listQikinkOrders(params?: { id?: string; fromDate?: string; toDate?: string }) {
  const auth = await getQikinkToken()
  if (!auth.ok) return auth

  const url = new URL(`${auth.baseUrl}/api/order`)
  if (params?.id) url.searchParams.set('id', params.id)
  if (params?.fromDate) url.searchParams.set('from_date', params.fromDate)
  if (params?.toDate) url.searchParams.set('to_date', params.toDate)

  const response = await fetch(url, {
    headers: {
      ClientId: auth.clientId,
      Accesstoken: auth.token,
    },
    signal: AbortSignal.timeout(20000),
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    return { ok: false as const, error: data.error || data.message || `Qikink orders failed with ${response.status}` }
  }

  return { ok: true as const, mode: auth.mode, data }
}

export function summarizeQikinkOrders(data: any) {
  const orders = Array.isArray(data) ? data : Array.isArray(data?.orders) ? data.orders : Array.isArray(data?.data) ? data.data : []
  const total = orders.length
  const byStatus = orders.reduce((acc: Record<string, number>, order: any) => {
    const status = String(order.status || order.order_status || order.fulfillment_status || 'unknown').toLowerCase()
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})

  return {
    total,
    byStatus,
    latest: orders.slice(0, 10),
  }
}
