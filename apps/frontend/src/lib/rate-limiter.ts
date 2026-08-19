import { Redis } from 'ioredis'

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

interface AbuseDetectionConfig {
  enabled: boolean
  suspiciousPatterns: {
    rapidLoginAttempts: { threshold: number; windowMs: number }
    highVolumeRequests: { threshold: number; windowMs: number }
    unusualUserAgents: boolean
    repeatedFailures: { threshold: number; windowMs: number }
  }
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: Date
  retryAfter?: Date
  isAbuseDetected?: boolean
  abuseReason?: string
}

export class AdvancedRateLimiter {
  private redis: Redis | null = null
  private abuseDetectionEnabled: boolean = false
  private localCache: Map<string, { count: number; resetTime: number }> = new Map()

  constructor() {
    if (process.env.REDIS_URL) {
      this.redis = new Redis(process.env.REDIS_URL, {
        lazyConnect: true,
        retryStrategy: (times) => Math.min(times * 50, 2000),
      })
      this.abuseDetectionEnabled = true
    }
  }

  async checkRateLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = Date.now()
    const windowStart = now - config.windowMs
    const resetTime = now + config.windowMs

    // Try Redis first if available
    if (this.redis) {
      return this.checkRedisRateLimit(identifier, config)
    }

    // Fallback to local cache
    return this.checkLocalRateLimit(identifier, config, now, windowStart, resetTime)
  }

  private async checkRedisRateLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    try {
      const key = `ratelimit:${identifier}`
      const now = Date.now()
      const windowStart = now - config.windowMs

      // Clean old entries
      await this.redis.zremrangebyscore(key, 0, windowStart)

      // Count current requests
      const count = await this.redis.zcard(key)
      const remaining = Math.max(0, config.maxRequests - count)
      const reset = new Date(now + config.windowMs)

      if (count >= config.maxRequests) {
        // Get oldest request to calculate retry after
        const oldest = await this.redis.zrange(key, 0, 0, 'WITHSCORES')
        const retryAfter = oldest.length > 0 ? new Date(Number(oldest[1]) + config.windowMs) : reset

        return {
          success: false,
          limit: config.maxRequests,
          remaining: 0,
          reset,
          retryAfter,
        }
      }

      // Add current request
      await this.redis.zadd(key, now, `${now}-${Math.random()}`)
      await this.redis.expire(key, Math.ceil(config.windowMs / 1000) + 1)

      return {
        success: true,
        limit: config.maxRequests,
        remaining: remaining - 1,
        reset,
      }
    } catch (error) {
      console.error('[RateLimiter] Redis error, falling back to local:', error)
      return this.checkLocalRateLimit(identifier, config, Date.now(), Date.now() - config.windowMs, Date.now() + config.windowMs)
    }
  }

  private checkLocalRateLimit(
    identifier: string,
    config: RateLimitConfig,
    now: number,
    windowStart: number,
    resetTime: number
  ): RateLimitResult {
    const cached = this.localCache.get(identifier)

    if (!cached || cached.resetTime < now) {
      // New window
      this.localCache.set(identifier, { count: 1, resetTime })
      return {
        success: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        reset: new Date(resetTime),
      }
    }

    if (cached.count >= config.maxRequests) {
      return {
        success: false,
        limit: config.maxRequests,
        remaining: 0,
        reset: new Date(cached.resetTime),
        retryAfter: new Date(cached.resetTime),
      }
    }

    cached.count++
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - cached.count,
      reset: new Date(cached.resetTime),
    }
  }

  async detectAbuse(
    identifier: string,
    eventType: 'login_attempt' | 'api_request' | 'failed_request',
    metadata?: { userAgent?: string; ip?: string }
  ): Promise<{ isAbuse: boolean; reason?: string }> {
    if (!this.abuseDetectionEnabled || !this.redis) {
      return { isAbuse: false }
    }

    const config: AbuseDetectionConfig = {
      enabled: true,
      suspiciousPatterns: {
        rapidLoginAttempts: { threshold: 10, windowMs: 60000 }, // 10 logins per minute
        highVolumeRequests: { threshold: 1000, windowMs: 60000 }, // 1000 requests per minute
        unusualUserAgents: true,
        repeatedFailures: { threshold: 50, windowMs: 60000 }, // 50 failures per minute
      },
    }

    const now = Date.now()

    try {
      // Check rapid login attempts
      if (eventType === 'login_attempt') {
        const loginKey = `abuse:logins:${identifier}`
        await this.redis.zremrangebyscore(loginKey, 0, now - config.suspiciousPatterns.rapidLoginAttempts.windowMs)
        await this.redis.zadd(loginKey, now, `${now}`)
        await this.redis.expire(loginKey, 60)
        
        const loginCount = await this.redis.zcard(loginKey)
        if (loginCount >= config.suspiciousPatterns.rapidLoginAttempts.threshold) {
          return { isAbuse: true, reason: 'Rapid login attempts detected' }
        }
      }

      // Check high volume requests
      if (eventType === 'api_request') {
        const requestKey = `abuse:requests:${identifier}`
        await this.redis.zremrangebyscore(requestKey, 0, now - config.suspiciousPatterns.highVolumeRequests.windowMs)
        await this.redis.zadd(requestKey, now, `${now}`)
        await this.redis.expire(requestKey, 60)
        
        const requestCount = await this.redis.zcard(requestKey)
        if (requestCount >= config.suspiciousPatterns.highVolumeRequests.threshold) {
          return { isAbuse: true, reason: 'High volume requests detected' }
        }
      }

      // Check repeated failures
      if (eventType === 'failed_request') {
        const failureKey = `abuse:failures:${identifier}`
        await this.redis.zremrangebyscore(failureKey, 0, now - config.suspiciousPatterns.repeatedFailures.windowMs)
        await this.redis.zadd(failureKey, now, `${now}`)
        await this.redis.expire(failureKey, 60)
        
        const failureCount = await this.redis.zcard(failureKey)
        if (failureCount >= config.suspiciousPatterns.repeatedFailures.threshold) {
          return { isAbuse: true, reason: 'Repeated failures detected' }
        }
      }

      // Check unusual user agents
      if (config.suspiciousPatterns.unusualUserAgents && metadata?.userAgent) {
        const ua = metadata.userAgent.toLowerCase()
        const suspiciousPatterns = ['bot', 'crawler', 'spider', 'scraper', 'curl', 'wget']
        
        if (suspiciousPatterns.some(pattern => ua.includes(pattern))) {
          // Additional check: if this UA is making too many requests
          const uaKey = `abuse:ua:${metadata.userAgent}`
          await this.redis.zremrangebyscore(uaKey, 0, now - 60000)
          await this.redis.zadd(uaKey, now, `${now}`)
          await this.redis.expire(uaKey, 60)
          
          const uaCount = await this.redis.zcard(uaKey)
          if (uaCount > 100) { // 100 requests per minute for suspicious UA
            return { isAbuse: true, reason: 'Suspicious user agent pattern' }
          }
        }
      }

      return { isAbuse: false }
    } catch (error) {
      console.error('[RateLimiter] Abuse detection error:', error)
      return { isAbuse: false } // Fail open for abuse detection
    }
  }

  async cleanup(): Promise<void> {
    // Clean local cache
    const now = Date.now()
    for (const [key, value] of this.localCache.entries()) {
      if (value.resetTime < now) {
        this.localCache.delete(key)
      }
    }
  }

  async getRateLimitStats(identifier: string): Promise<{
    currentUsage: number
    limit: number
    windowStart: number
    windowEnd: number
  }> {
    if (this.redis) {
      try {
        const key = `ratelimit:${identifier}`
        const now = Date.now()
        const windowStart = now - 60000 // Default 1 minute window
        
        await this.redis.zremrangebyscore(key, 0, windowStart)
        const count = await this.redis.zcard(key)
        
        return {
          currentUsage: count,
          limit: 100, // Default limit
          windowStart,
          windowEnd: now + 60000,
        }
      } catch (error) {
        console.error('[RateLimiter] Stats error:', error)
      }
    }

    // Fallback to local cache
    const cached = this.localCache.get(identifier)
    return {
      currentUsage: cached?.count || 0,
      limit: 100,
      windowStart: Date.now() - 60000,
      windowEnd: Date.now() + 60000,
    }
  }
}

// Predefined rate limit configurations
export const RateLimitConfigs = {
  // Strict limits for sensitive operations
  AUTH: { windowMs: 60000, maxRequests: 5 }, // 5 requests per minute
  APPROVAL: { windowMs: 60000, maxRequests: 10 }, // 10 requests per minute
  
  // Standard API limits
  API: { windowMs: 60000, maxRequests: 100 }, // 100 requests per minute
  READ: { windowMs: 60000, maxRequests: 200 }, // 200 requests per minute
  
  // Generous limits for webhooks and integrations
  WEBHOOK: { windowMs: 60000, maxRequests: 50 }, // 50 requests per minute
  INTEGRATION: { windowMs: 60000, maxRequests: 30 }, // 30 requests per minute
  
  // Agent operations
  AGENT: { windowMs: 60000, maxRequests: 20 }, // 20 requests per minute
  WORKFLOW: { windowMs: 60000, maxRequests: 15 }, // 15 requests per minute
}

// Singleton instance
export const rateLimiter = new AdvancedRateLimiter()

// Middleware helper for Next.js API routes
export async function applyRateLimit(
  identifier: string,
  configName: keyof typeof RateLimitConfigs,
  request?: Request
): Promise<{ success: boolean; errorResponse?: { status: number; body: any; headers: Record<string, string> } }> {
  const config = RateLimitConfigs[configName]
  const result = await rateLimiter.checkRateLimit(identifier, config)

  // Detect abuse if request metadata is available
  if (request && result.success) {
    const userAgent = request.headers.get('user-agent') || undefined
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'
    
    const abuseCheck = await rateLimiter.detectAbuse(
      identifier,
      'api_request',
      { userAgent, ip }
    )

    if (abuseCheck.isAbuse) {
      return {
        success: false,
        errorResponse: {
          status: 429,
          body: { 
            error: 'Abuse detected', 
            reason: abuseCheck.reason,
            retryAfter: result.retryAfter?.toISOString() 
          },
          headers: {
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.reset.toISOString(),
            'Retry-After': result.retryAfter ? Math.ceil((result.retryAfter.getTime() - Date.now()) / 1000).toString() : '60',
          }
        }
      }
    }
  }

  if (!result.success) {
    return {
      success: false,
      errorResponse: {
        status: 429,
        body: { 
          error: 'Rate limit exceeded',
          retryAfter: result.retryAfter?.toISOString() 
        },
        headers: {
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.reset.toISOString(),
          'Retry-After': result.retryAfter ? Math.ceil((result.retryAfter.getTime() - Date.now()) / 1000).toString() : '60',
        }
      }
    }
  }

  return { success: true }
}