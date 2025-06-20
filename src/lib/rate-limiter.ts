/**
 * Rate Limiter Utility for API Endpoints
 * Phase 5: API Security Enhancement
 * 
 * Implements in-memory rate limiting with configurable limits
 * In production, this should be backed by Redis for distributed systems
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
  blockExpires?: number;
}

interface RateLimitConfig {
  windowMs: number;    // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  blockDurationMs?: number; // Block duration after limit exceeded
  skipSuccessfulRequests?: boolean; // Don't count successful requests
}

class RateLimiter {
  private cache = new Map<string, RateLimitEntry>();
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: config.windowMs,
      maxRequests: config.maxRequests,
      blockDurationMs: config.blockDurationMs || config.windowMs * 2,
      skipSuccessfulRequests: config.skipSuccessfulRequests || false
    };
  }

  /**
   * Check if request should be rate limited
   */
  public check(identifier: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    blockExpires?: number;
  } {
    const now = Date.now();
    const entry = this.cache.get(identifier);

    // Clean up expired entries periodically
    this.cleanup(now);

    // Check if currently blocked
    if (entry?.blocked && entry.blockExpires && now < entry.blockExpires) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        blockExpires: entry.blockExpires
      };
    }

    // Initialize or reset if window expired
    if (!entry || now >= entry.resetTime) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + this.config.windowMs,
        blocked: false
      };
      this.cache.set(identifier, newEntry);
      
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: newEntry.resetTime
      };
    }

    // Increment count
    entry.count++;

    // Check if limit exceeded
    if (entry.count > this.config.maxRequests) {
      entry.blocked = true;
      entry.blockExpires = now + this.config.blockDurationMs;
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        blockExpires: entry.blockExpires
      };
    }

    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  }

  /**
   * Record successful request (if configured to skip counting)
   */
  public recordSuccess(identifier: string): void {
    if (!this.config.skipSuccessfulRequests) return;
    
    const entry = this.cache.get(identifier);
    if (entry && entry.count > 0) {
      entry.count--;
    }
  }

  /**
   * Reset rate limit for identifier (admin override)
   */
  public reset(identifier: string): void {
    this.cache.delete(identifier);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(now: number): void {
    // Only cleanup every 5 minutes to avoid performance impact
    const cleanupInterval = 5 * 60 * 1000; // 5 minutes
    if (!this.lastCleanup || now - this.lastCleanup > cleanupInterval) {
      const keysToDelete: string[] = [];
      this.cache.forEach((entry, key) => {
        if (now >= entry.resetTime && (!entry.blockExpires || now >= entry.blockExpires)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => this.cache.delete(key));
      this.lastCleanup = now;
    }
  }

  private lastCleanup = 0;
}

// Pre-configured rate limiters for different endpoint types
export const rateLimiters = {
  // Time clock punch - public endpoint, strict limits
  timeClock: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,           // 10 attempts per 15 minutes
    blockDurationMs: 30 * 60 * 1000, // 30 minute block
    skipSuccessfulRequests: true // Don't count successful authentications
  }),

  // Staff API - admin only, moderate limits
  staffApi: new RateLimiter({
    windowMs: 5 * 60 * 1000,  // 5 minutes
    maxRequests: 100,         // 100 requests per 5 minutes
    blockDurationMs: 10 * 60 * 1000 // 10 minute block
  }),

  // Photo management - resource intensive, tight limits
  photoApi: new RateLimiter({
    windowMs: 1 * 60 * 1000,  // 1 minute
    maxRequests: 10,          // 10 requests per minute
    blockDurationMs: 5 * 60 * 1000 // 5 minute block
  }),

  // General API - moderate limits for other endpoints
  general: new RateLimiter({
    windowMs: 1 * 60 * 1000,  // 1 minute
    maxRequests: 60,          // 60 requests per minute
    blockDurationMs: 2 * 60 * 1000 // 2 minute block
  })
};

/**
 * Helper function to get client identifier for rate limiting
 */
export function getClientIdentifier(request: Request): string {
  // Use multiple identifiers for better security
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const userAgent = request.headers.get('user-agent') || '';
  
  // Primary IP (prefer forwarded for proxy setups)
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  
  // Create composite identifier (IP + partial user agent hash)
  const uaHash = userAgent.length > 0 ? 
    userAgent.substring(0, 20).replace(/\W/g, '') : 'no-ua';
  
  return `${ip}:${uaHash}`;
}

/**
 * Rate limiting middleware for Next.js API routes
 */
export function createRateLimitMiddleware(limiter: RateLimiter) {
  return (request: Request) => {
    const identifier = getClientIdentifier(request);
    const result = limiter.check(identifier);
    
    return {
      ...result,
      identifier,
      recordSuccess: () => limiter.recordSuccess(identifier),
      reset: () => limiter.reset(identifier)
    };
  };
}

// Export specific middleware for common use cases
export const timeClockRateLimit = createRateLimitMiddleware(rateLimiters.timeClock);
export const staffApiRateLimit = createRateLimitMiddleware(rateLimiters.staffApi);
export const photoApiRateLimit = createRateLimitMiddleware(rateLimiters.photoApi);
export const generalApiRateLimit = createRateLimitMiddleware(rateLimiters.general); 