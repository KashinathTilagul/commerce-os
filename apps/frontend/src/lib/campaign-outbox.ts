import { randomUUID } from 'node:crypto'
import { Prisma, type OutboxMessage } from '@prisma/client'
import { db } from './db'
import { enqueueOutboxJob } from './queue'

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
    try {
      await enqueueOutboxJob(message.deduplicationKey, {
        outboxMessageId: message.id,
        organizationId: message.organizationId,
        aggregateType: message.aggregateType,
        aggregateId: message.aggregateId,
        aggregateVersion: message.aggregateVersion,
        eventType: message.eventType,
        payload: message.payload,
      })
      await db.outboxMessage.updateMany({
        where: { id: message.id, leaseToken, status: 'PROCESSING' },
        data: { status: 'DISPATCHED', dispatchedAt: new Date(), leaseToken: null, leaseExpiresAt: null },
      })
      results.push({ id: message.id, dispatched: true })
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Outbox enqueue failed'
      const retryDelayMs = Math.min(300_000, 1000 * 2 ** Math.min(message.attemptCount, 8))
      await db.outboxMessage.updateMany({
        where: { id: message.id, leaseToken, status: 'PROCESSING' },
        data: {
          status: 'PENDING',
          leaseToken: null,
          leaseExpiresAt: null,
          nextAttemptAt: new Date(Date.now() + retryDelayMs),
          lastError: reason.slice(0, 2000),
        },
      })
      results.push({ id: message.id, dispatched: false, error: reason })
    }
  }

  return results
}
