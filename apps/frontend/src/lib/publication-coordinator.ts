import { Prisma } from '@prisma/client'
import { db } from './db'
import { enqueueOutboxJob } from './queue'

export interface PublishContext {
  organizationId: string
  launchId: string
  revisionId: string
}

export async function publishCampaignRevision(ctx: PublishContext) {
  const revision = await db.campaignRevision.findFirstOrThrow({
    where: { id: ctx.revisionId, launchId: ctx.launchId },
    include: {
      launch: true,
      publishLogs: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (revision.status !== 'APPROVED') {
    throw new Error(`Campaign revision ${ctx.revisionId} is not approved`)
  }
  if (revision.publishStatus === 'PUBLISHED') {
    return { status: 'PUBLISHED' as const }
  }

  await db.campaignRevision.update({
    where: { id: ctx.revisionId },
    data: { publishStatus: 'PUBLISHING', publishStartedAt: new Date() },
  })
  await db.campaignLaunch.update({
    where: { id: ctx.launchId },
    data: { status: 'PUBLISHING', version: { increment: 1 } },
  })

  const steps = [
    { provider: 'shopify', action: 'discount_activate', dependsOn: [] },
    { provider: 'meta', action: 'campaign_activate', dependsOn: ['shopify_discount_activate'] },
    { provider: 'instagram', action: 'publish_feed', dependsOn: ['shopify_discount_activate', 'meta_campaign_activate'] },
    { provider: 'instagram', action: 'publish_story', dependsOn: ['instagram_publish_feed'] },
    { provider: 'instagram', action: 'publish_reel', dependsOn: ['instagram_publish_feed'] },
  ]

  const completed = new Map<string, Prisma.PromiseReturnType<typeof db.campaignPublishLog.findFirst>>()
  const blocked: string[] = []

  for (const step of steps) {
    const dependencyMet = step.dependsOn.every((dep) => {
      const prior = completed.get(dep)
      return prior && prior.status === 'CONFIRMED'
    })
    if (!dependencyMet) {
      await db.campaignPublishLog.create({
        data: {
          revisionId: ctx.revisionId,
          launchId: ctx.launchId,
          provider: step.provider,
          action: step.action,
          idempotencyKey: `${ctx.revisionId}:${step.provider}:${step.action}`,
          status: 'BLOCKED',
          errorMessage: `Dependency not met: ${step.dependsOn.join(', ')}`,
        },
      })
      blocked.push(`${step.provider}:${step.action}`)
      continue
    }

    const existing = await db.campaignPublishLog.findFirst({
      where: { revisionId: ctx.revisionId, provider: step.provider, action: step.action },
    })
    if (existing?.status === 'CONFIRMED') {
      completed.set(`${step.provider}_${step.action}`, existing)
      continue
    }

    const log = await db.campaignPublishLog.create({
      data: {
        revisionId: ctx.revisionId,
        launchId: ctx.launchId,
        provider: step.provider,
        action: step.action,
        idempotencyKey: `${ctx.revisionId}:${step.provider}:${step.action}`,
        status: 'PENDING',
      },
    })

    await enqueueOutboxJob(log.idempotencyKey, {
      outboxMessageId: log.id,
      organizationId: ctx.organizationId,
      aggregateType: 'CampaignPublishLog',
      aggregateId: log.id,
      eventType: 'PUBLISH_ACTION_NEEDED',
      payload: {
        launchId: ctx.launchId,
        revisionId: ctx.revisionId,
        provider: step.provider,
        action: step.action,
        publishLogId: log.id,
      },
    })
  }

  const anyConfirmed = await db.campaignPublishLog.count({
    where: { revisionId: ctx.revisionId, status: 'CONFIRMED' },
  })
  const anyFailed = await db.campaignPublishLog.count({
    where: { revisionId: ctx.revisionId, status: 'FAILED' },
  })
  const total = await db.campaignPublishLog.count({ where: { revisionId: ctx.revisionId } })

  if (anyConfirmed > 0 && anyFailed > 0) {
    await db.campaignRevision.update({
      where: { id: ctx.revisionId },
      data: { publishStatus: 'PARTIALLY_PUBLISHED', publishCompletedAt: new Date() },
    })
    await db.campaignLaunch.update({ where: { id: ctx.launchId }, data: { status: 'PARTIALLY_PUBLISHED' } })
    return { status: 'PARTIALLY_PUBLISHED' as const }
  }
  if (total > 0 && anyFailed === total) {
    await db.campaignRevision.update({
      where: { id: ctx.revisionId },
      data: { publishStatus: 'BLOCKED', publishCompletedAt: new Date() },
    })
    await db.campaignLaunch.update({ where: { id: ctx.launchId }, data: { status: 'BLOCKED' } })
    return { status: 'BLOCKED' as const }
  }
  if (blocked.length > 0) {
    return { status: 'BLOCKED' as const, blocked }
  }

  return { status: 'PUBLISHING' as const }
}
