export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

export const RATE_LIMIT_CONFIG: Record<string, RateLimitConfig> = {
  default: { windowMs: 60000, maxRequests: 100 },
  api: { windowMs: 60000, maxRequests: 300 },
  authLogin: { windowMs: 900000, maxRequests: 10 },
  authSession: { windowMs: 60000, maxRequests: 60 },
  chat: { windowMs: 60000, maxRequests: 20 },
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(ip: string, path: string): { allowed: boolean; retryAfter: number } {
  const bucket = path.includes('/api/auth/callback') ? 'authLogin'
    : path.includes('/api/auth') ? 'authSession'
    : path.includes('/api/jarvis/chat') ? 'chat'
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
  const ip = forwarded ? forwarded.split(',')[0] : '127.0.0.1'
  return ip
}
