import { createHash, timingSafeEqual } from 'node:crypto'

export function isCronAuthorized(headers: Headers): boolean {
  const secret = process.env.CRON_SECRET
  const supplied = headers.get('x-cron-secret')
  if (!secret || !supplied) return false
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(secret), digest(supplied))
}
