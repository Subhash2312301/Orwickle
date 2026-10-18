import { Request, Response, NextFunction } from 'express';
import { TooManyRequestsError } from '../errors/app-error';

interface RateLimitRecord {
  timestamps: number[];
}

class SlidingWindowRateLimiter {
  private store = new Map<string, RateLimitRecord>();

  constructor() {
    // Periodic cleanup of stale keys every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
  }

  public check(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;

    let record = this.store.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.store.set(key, record);
    }

    // Retain only timestamps within the sliding window
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= limit) {
      return false; // Rate limit exceeded
    }

    record.timestamps.push(now);
    return true;
  }

  public getRemaining(key: string, limit: number, windowMs: number): number {
    const now = Date.now();
    const windowStart = now - windowMs;
    const record = this.store.get(key);
    if (!record) return limit;
    const active = record.timestamps.filter((ts) => ts > windowStart).length;
    return Math.max(0, limit - active);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      record.timestamps = record.timestamps.filter((ts) => ts > now - 60 * 60 * 1000);
      if (record.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }

  public reset(key: string): void {
    this.store.delete(key);
  }
}

export const rateLimiter = new SlidingWindowRateLimiter();

/**
 * Middleware evaluating per-IP rate limit BEFORE any cryptographic work (ADR-003).
 */
export function preCryptoIpRateLimit(limit = 20, windowMs = 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const key = `ip:${ip}`;

    const allowed = rateLimiter.check(key, limit, windowMs);
    if (!allowed) {
      throw new TooManyRequestsError(
        'Too many authentication requests from this IP address. Please pause before retrying.'
      );
    }

    next();
  };
}

/**
 * Helper to check per-identifier rate limit before Argon2 hashing
 */
export function assertIdentifierRateLimit(
  identifier: string,
  prefix = 'email',
  limit = 5,
  windowMs = 60 * 1000
): void {
  const key = `${prefix}:${identifier.toLowerCase().trim()}`;
  const allowed = rateLimiter.check(key, limit, windowMs);
  if (!allowed) {
    throw new TooManyRequestsError(
      'Too many requests for this account. Please wait before attempting again.'
    );
  }
}
