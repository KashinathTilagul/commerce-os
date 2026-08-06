export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

export const RATE_LIMIT_CONFIG: Record<string, RateLimitConfig> = {
  default: { windowMs: 60000, maxRequests: 500 },
  api: { windowMs: 60000, maxRequests: 1000 },
  authLogin: { windowMs: 900000, maxRequests: 30 },
  authSession: { windowMs: 60000, maxRequests: 300 },
  chat: { windowMs: 60000, maxRequests: 200 },
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(ip: string, path: string): { allowed: boolean; retryAfter: number } {
  // Bypass rate limits on localhost and in development mode
  if (process.env.NODE_ENV !== 'production' || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
    return { allowed: true, retryAfter: 0 }
  }

  const bucket = path.includes('/api/auth/callback') ? 'authLogin'
    : path.includes('/api/auth') ? 'authSession'
    : path.includes('/api/jarvis/') ? 'chat'
    : path.startsWith('/api/') ? 'api'
    : 'default'

  const config = RATE_LIMIT_CONFIG[bucket] || RATE_LIMIT_CONFIG.default
  const key = `${ip}:${bucket}`
  const now = Date.now()

  let record = rateLimitStore.get(key)
  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + config.windowMs }
    rateLimitStore.set(key, record)
    return { allowed: true, retryAfter: 0 }
  }

  record.count++
  if (record.count > config.maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((record.resetTime - now) / 1000) }
  }

  return { allowed: true, retryAfter: 0 }
}

export function getClientIP(req: any): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1'
  return ip
}
