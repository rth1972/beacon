/**
 * Simple in-memory rate limiter per topic.
 * Default: 60 messages per minute per topic.
 * Override with NTFY_RATE_LIMIT=<number> env var.
 */

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

const WINDOW_MS = 60_000 // 1 minute
const MAX = parseInt(process.env.NTFY_RATE_LIMIT ?? '60')

export function checkRateLimit(topic: string): { ok: boolean; remaining: number; resetAt: number } {
  if (MAX <= 0) return { ok: true, remaining: Infinity, resetAt: 0 } // disabled

  const now = Date.now()
  let bucket = buckets.get(topic)

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + WINDOW_MS }
    buckets.set(topic, bucket)
  }

  bucket.count++
  const remaining = Math.max(0, MAX - bucket.count)
  const ok = bucket.count <= MAX

  return { ok, remaining, resetAt: bucket.resetAt }
}

// Clean up old buckets every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key)
  }
}, 5 * 60_000)
