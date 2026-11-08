import Redis from 'ioredis'
import { randomUUID } from 'node:crypto'

let redis: Redis | undefined
export async function withSchedulerLock<T>(name: string, work: () => Promise<T>) {
  // Fail closed: a missing/unreachable shared lock must not duplicate work.
  // Opt-in for single-runner deployments (e.g. Vercel Cron, one invocation per schedule).
  if (!process.env.REDIS_URL && process.env.SCHEDULER_ALLOW_NO_LOCK === '1') return await work()
  if (!process.env.REDIS_URL) throw new Error('REDIS_URL required for scheduled work')
  redis ??= new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1 })
  const key = `ekvaar:scheduler:${name}`
  const token = randomUUID()
  const leaseMs = 30 * 60 * 1000
  if (await redis.set(key, token, 'PX', leaseMs, 'NX') !== 'OK') return
  // ponytail: lease is not fencing; a process paused longer than 30 minutes
  // can outlive ownership. Upgrade to durable job claims before that workload.
  const renewal = setInterval(() => {
    redis!.eval("if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('pexpire',KEYS[1],ARGV[2]) else return 0 end", 1, key, token, leaseMs)
      .catch(error => console.error('[scheduler] Lock renewal failed', error))
  }, 10_000)
  try {
    return await work()
  } finally {
    clearInterval(renewal)
    await redis.eval("if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end", 1, key, token)
  }
}
