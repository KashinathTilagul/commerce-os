import { createHash, timingSafeEqual } from 'node:crypto'

export function isCronAuthorized(headers: Headers): boolean {
  const secret = process.env.CRON_SECRET
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; other schedulers use x-cron-secret.
  const bearer = headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1]
  const supplied = headers.get('x-cron-secret') || bearer
  if (!secret || !supplied) return false
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(secret), digest(supplied))
}
