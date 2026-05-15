import {
  RATE_LIMIT_MAX_ENTRIES,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
} from "../constants.js";

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

function touchBucket(clientIp: string, bucket: Bucket): void {
  buckets.delete(clientIp);
  buckets.set(clientIp, bucket);
}

function evictLeastRecentlyUsed(): void {
  if (buckets.size <= RATE_LIMIT_MAX_ENTRIES) return;
  const oldestKey = buckets.keys().next().value as string | undefined;
  if (oldestKey !== undefined) buckets.delete(oldestKey);
}

/**
 * Fixed-window in-memory rate limiter keyed by client IP. Resets on Lambda cold start.
 * Returns whether the request is allowed.
 */
export function checkRateLimit(clientIp: string, nowMs: number): boolean {
  const existing = buckets.get(clientIp);
  if (!existing) {
    evictLeastRecentlyUsed();
    buckets.set(clientIp, { count: 1, windowStart: nowMs });
    return true;
  }
  const elapsed = nowMs - existing.windowStart;
  if (elapsed >= RATE_LIMIT_WINDOW_MS) {
    existing.count = 1;
    existing.windowStart = nowMs;
    touchBucket(clientIp, existing);
    return true;
  }
  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    touchBucket(clientIp, existing);
    return false;
  }
  existing.count += 1;
  touchBucket(clientIp, existing);
  return true;
}

/** Clears all buckets (tests only). */
export function resetRateLimitForTests(): void {
  buckets.clear();
}
