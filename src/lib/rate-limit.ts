/**
 * VERA Rate Limiter
 * In-memory sliding-window rate limiter for API protection
 * 
 * ponytail: in-memory rate limiter loses state on restart and doesn't work
 * across multiple instances; upgrade path is Redis-backed (Upstash) when
 * scaling horizontally
 */

interface RateLimitEntry {
  timestamps: number[];
}

export class RateLimiter {
  private storage: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Auto-cleanup old entries every 15 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 15 * 60 * 1000);
  }

  /**
   * Check if a request is allowed under the rate limit
   * @param key - Unique identifier (e.g., IP address)
   * @param limit - Maximum number of requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns Object with allowed status, remaining requests, and reset time
   */
  check(
    key: string,
    limit: number,
    windowMs: number
  ): { allowed: boolean; remaining: number; reset: number } {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create entry
    let entry = this.storage.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.storage.set(key, entry);
    }

    // Filter out timestamps outside the window
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

    const currentCount = entry.timestamps.length;
    const allowed = currentCount < limit;

    if (allowed) {
      entry.timestamps.push(now);
    }

    const remaining = Math.max(0, limit - entry.timestamps.length);
    const oldestTimestamp = entry.timestamps[0] || now;
    const reset = oldestTimestamp + windowMs;

    return { allowed, remaining, reset };
  }

  /**
   * Clean up entries with no recent activity
   * Removes entries where all timestamps are older than 1 hour
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    for (const [key, entry] of this.storage.entries()) {
      const hasRecentActivity = entry.timestamps.some((ts) => now - ts < maxAge);
      if (!hasRecentActivity) {
        this.storage.delete(key);
      }
    }
  }

  /**
   * Clear all rate limit data (useful for testing)
   */
  clear(): void {
    this.storage.clear();
  }

  /**
   * Stop the cleanup interval (useful for graceful shutdown)
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();
