import { createHash, timingSafeEqual } from 'node:crypto'

/** Constant-time equality check over arbitrary-length secrets via SHA-256 digests. */
export function secretsMatch(supplied: string | null | undefined, expected: string | null | undefined): boolean {
  if (!expected || !supplied) return false
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(expected), digest(supplied))
}

export function isCronAuthorized(headers: Headers): boolean {
  const secret = process.env.CRON_SECRET
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; other schedulers use x-cron-secret.
  const bearer = headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1]
  const supplied = headers.get('x-cron-secret') || bearer
  return secretsMatch(supplied, secret)
}
