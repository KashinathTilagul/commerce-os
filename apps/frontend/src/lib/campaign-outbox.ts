import { randomUUID } from 'node:crypto'
import { Prisma, type OutboxMessage } from '@prisma/client'
import { db } from './db'

export async function claimOutboxBatch(limit = 20, leaseSeconds = 60) {
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)))
  const safeLeaseSeconds = Math.max(5, Math.min(300, Math.trunc(leaseSeconds)))
  const leaseToken = randomUUID()

  const messages = await db.$queryRaw<OutboxMessage[]>(Prisma.sql`
    WITH candidates AS (
      SELECT "id"
      FROM "OutboxMessage"
      WHERE (
        ("status" = 'PENDING' AND "nextAttemptAt" <= NOW())
        OR ("status" = 'PROCESSING' AND "leaseExpiresAt" < NOW())
      )
      ORDER BY "createdAt"
      FOR UPDATE SKIP LOCKED
      LIMIT ${safeLimit}
    )
    UPDATE "OutboxMessage" AS message
    SET "status" = 'PROCESSING',
        "leaseToken" = ${leaseToken},
        "leaseExpiresAt" = NOW() + make_interval(secs => ${safeLeaseSeconds}),
        "attemptCount" = message."attemptCount" + 1,
        "updatedAt" = NOW()
    FROM candidates
    WHERE message."id" = candidates."id"
    RETURNING message.*
  `)

  return { leaseToken, messages }
}

export async function dispatchOutboxBatch(limit = 20) {
  const { leaseToken, messages } = await claimOutboxBatch(limit)
  const results: Array<{ id: string; dispatched: boolean; error?: string }> = []

  for (const message of messages) {
    // ponytail: the "campaign-events" BullMQ queue has no consumer, so nothing
    // is actually delivered here — marking DISPATCHED was a fake success. Until
    // a real delivery path exists (a queue worker or synchronous dispatch),
    // mark FAILED so the gap stays visible. Upgrade path: add a consumer for
    // campaign-events (or deliver synchronously) and only then set DISPATCHED.
    const reason = 'No delivery consumer exists for campaign-events'
    try {
      await db.outboxMessage.updateMany({
        where: { id: message.id, leaseToken, status: 'PROCESSING' },
        data: { status: 'FAILED', leaseToken: null, leaseExpiresAt: null, lastError: reason },
      })
      results.push({ id: message.id, dispatched: false, error: reason })
    } catch (error) {
      const dbReason = error instanceof Error ? error.message : 'Outbox status update failed'
      await db.outboxMessage.updateMany({
        where: { id: message.id, leaseToken, status: 'PROCESSING' },
        data: {
          status: 'PENDING',
          leaseToken: null,
          leaseExpiresAt: null,
          nextAttemptAt: new Date(Date.now() + 300_000),
          lastError: dbReason.slice(0, 2000),
        },
      })
      results.push({ id: message.id, dispatched: false, error: dbReason })
    }
  }

  return results
}
