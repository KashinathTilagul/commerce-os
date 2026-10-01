import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { filterSensitiveData } from "./sensitive-data"

export { filterSensitiveData } from "./sensitive-data"

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

export const RATE_LIMIT_CONFIG: Record<string, RateLimitConfig> = {
  default: { windowMs: 60000, maxRequests: 100 },
  // Shared across every /api/* route per IP — the desktop opens many modules
  // that each fetch on mount, so this needs headroom for a single real user.
  api: { windowMs: 60000, maxRequests: 300 },
  // Only actual credential submissions are brute-force targets. session/csrf
  // are polled constantly by next-auth just from having the lock screen open.
  authLogin: { windowMs: 900000, maxRequests: 10 },
  authSession: { windowMs: 60000, maxRequests: 60 },
}

// ponytail: in-memory rate limits — single-container assumption, lost on restart. 
// Use Redis + Upstash for multi-instance deployments.
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()
const rateLimitCleanup = setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitStore) if (record.resetTime <= now) rateLimitStore.delete(key)
}, 60_000)
rateLimitCleanup.unref?.()

export function checkRateLimit(ip: string, path: string): { allowed: boolean; retryAfter: number } {
  const bucket = path.includes("/api/auth/callback") ? "authLogin"
    : path.includes("/api/auth") ? "authSession"
    : path.startsWith("/api/") ? "api"
    : "default"
  const config = RATE_LIMIT_CONFIG[bucket]

  // bucket is part of the key so distinct configs (e.g. auth session polling
  // vs. login attempts) don't share the same counter and starve each other.
  const key = `${ip}:${bucket}`
  const now = Date.now()
  const record = rateLimitStore.get(key)

  if (!record || now > record.resetTime) {
    if (!record && rateLimitStore.size >= 50_000) return { allowed: false, retryAfter: 60 }
    rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs })
    return { allowed: true, retryAfter: 0 }
  }

  if (record.count >= config.maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((record.resetTime - now) / 1000) }
  }

  record.count++
  return { allowed: true, retryAfter: 0 }
}

export function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")
  const realIP = req.headers.get("x-real-ip")
  const cfIP = req.headers.get("cf-connecting-ip")
  
  return cfIP || realIP || (forwarded?.split(",")[0]?.trim()) || "unknown"
}

interface SanitizeOptions {
  stripHtml?: boolean
  maxLength?: number
  allowedTags?: string[]
}

const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /data:/gi,
  /vbscript:/gi,
]

export function sanitizeInput(input: string, options: SanitizeOptions = {}): string {
  if (typeof input !== "string") return ""

  let sanitized = input

  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, "")
  }

  if (options.stripHtml) {
    sanitized = sanitized.replace(/<[^>]*>/g, "")
  }

  if (options.maxLength) {
    sanitized = sanitized.slice(0, options.maxLength)
  }

  return sanitized.trim()
}

export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  options: SanitizeOptions = {}
): T {
  const result: Record<string, any> = {}

  for (const [key, value] of Object.entries(obj)) {
    const cleanKey = sanitizeInput(key, { maxLength: 50 })
    
    if (typeof value === "string") {
      result[cleanKey] = sanitizeInput(value, options)
    } else if (typeof value === "object" && value !== null) {
      result[cleanKey] = sanitizeObject(value, options)
    } else {
      result[cleanKey] = value
    }
  }

  return result as T
}

export function createApiResponse<T>(data: T, status = 200) {
  return NextResponse.json(filterSensitiveData(data), { status })
}

export function createApiError(message: string, status = 400, details?: Record<string, any>) {
  return NextResponse.json(
    { 
      error: sanitizeInput(message, { maxLength: 200 }),
      ...(process.env.NODE_ENV === "development" && details ? { details } : {})
    },
    { status }
  )
}

export function withValidation<T extends z.ZodType>(schema: T, handler: (data: z.infer<T>) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    try {
      const body = await req.json()
      const sanitized = sanitizeObject(body, { stripHtml: true })
      const validated = schema.parse(sanitized)
      return handler(validated)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createApiError("Validation error", 400, { 
          issues: error.issues.map(i => ({ path: i.path.join("."), message: i.message }))
        })
      }
      return createApiError("Invalid request body", 400)
    }
  }
}

setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 60000)
