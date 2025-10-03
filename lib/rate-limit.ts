import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Define rate limit configurations
export const rateLimitConfig = {
  email: {
    requests: 5,
    window: '1 m', // 5 requests per minute
  },
  freeagent: {
    requests: 10,
    window: '1 m', // 10 requests per minute
  },
  api: {
    requests: 50,
    window: '1 m', // 50 requests per minute
  },
} as const

// Create Redis client if credentials are available
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null

// Create rate limiters for different use cases
export const emailRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(rateLimitConfig.email.requests, rateLimitConfig.email.window),
      analytics: true,
      prefix: 'ratelimit:email',
    })
  : null

export const freeagentRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(rateLimitConfig.freeagent.requests, rateLimitConfig.freeagent.window),
      analytics: true,
      prefix: 'ratelimit:freeagent',
    })
  : null

export const apiRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(rateLimitConfig.api.requests, rateLimitConfig.api.window),
      analytics: true,
      prefix: 'ratelimit:api',
    })
  : null

// In-memory fallback for development (when Upstash is not configured)
class InMemoryRateLimit {
  private requests: Map<string, { count: number; resetTime: number }> = new Map()
  private maxRequests: number
  private windowMs: number

  constructor(maxRequests: number, windowMinutes: number) {
    this.maxRequests = maxRequests
    this.windowMs = windowMinutes * 60 * 1000
  }

  async limit(identifier: string): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
    const now = Date.now()
    const data = this.requests.get(identifier)

    // Clean up old entries periodically
    if (Math.random() < 0.1) {
      for (const [key, value] of this.requests.entries()) {
        if (value.resetTime < now) {
          this.requests.delete(key)
        }
      }
    }

    if (!data || data.resetTime < now) {
      // First request or window has reset
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      })
      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - 1,
        reset: now + this.windowMs,
      }
    }

    if (data.count >= this.maxRequests) {
      // Rate limit exceeded
      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        reset: data.resetTime,
      }
    }

    // Increment counter
    data.count++
    this.requests.set(identifier, data)

    return {
      success: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - data.count,
      reset: data.resetTime,
    }
  }
}

// Fallback rate limiters (in-memory)
const inMemoryEmailRateLimit = new InMemoryRateLimit(rateLimitConfig.email.requests, 1)
const inMemoryFreeagentRateLimit = new InMemoryRateLimit(rateLimitConfig.freeagent.requests, 1)
const inMemoryApiRateLimit = new InMemoryRateLimit(rateLimitConfig.api.requests, 1)

// Helper function to get identifier from request (IP or user ID)
export function getIdentifier(request: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`
  }

  // Try to get IP from headers (works with Vercel, Cloudflare, etc.)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || realIp || 'unknown'

  return `ip:${ip}`
}

// Unified rate limit check function
export async function checkRateLimit(
  type: 'email' | 'freeagent' | 'api',
  identifier: string
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  let rateLimiter: Ratelimit | null = null
  let fallbackLimiter: InMemoryRateLimit

  switch (type) {
    case 'email':
      rateLimiter = emailRateLimit
      fallbackLimiter = inMemoryEmailRateLimit
      break
    case 'freeagent':
      rateLimiter = freeagentRateLimit
      fallbackLimiter = inMemoryFreeagentRateLimit
      break
    case 'api':
      rateLimiter = apiRateLimit
      fallbackLimiter = inMemoryApiRateLimit
      break
  }

  // Use Upstash if available, otherwise use in-memory fallback
  if (rateLimiter) {
    const result = await rateLimiter.limit(identifier)
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    }
  }

  // Fallback to in-memory
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Rate Limit] Using in-memory fallback for ${type} (Upstash not configured)`)
  }

  return await fallbackLimiter.limit(identifier)
}

// Helper to add rate limit headers to response
export function addRateLimitHeaders(
  headers: Headers,
  result: { limit: number; remaining: number; reset: number }
): void {
  headers.set('X-RateLimit-Limit', result.limit.toString())
  headers.set('X-RateLimit-Remaining', result.remaining.toString())
  headers.set('X-RateLimit-Reset', result.reset.toString())
}
