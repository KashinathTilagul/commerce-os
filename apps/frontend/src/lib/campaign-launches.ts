import {
  Prisma,
  type CampaignLaunchStatus,
  type CampaignPriority,
} from '@prisma/client'
import { db } from './db'
import { nextCampaignLaunchCode } from './campaign-launch-code'
import { campaignOutboxKey } from './campaign-outbox-key'
import { assertCampaignLaunchTransition, assertUserManagedCampaignStatus } from './campaign-state'

export interface CreateCampaignLaunchInput {
  organizationId: string
  title: string
  brief: string
  priority?: CampaignPriority
  budgetCap?: string | null
}

export interface UpdateCampaignLaunchInput {
  organizationId: string
  id: string
  expectedVersion: number
  title?: string
  brief?: string
  priority?: CampaignPriority
  budgetCap?: string | null
  status?: CampaignLaunchStatus
}

function isTransactionRetry(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)
}

function budgetValue(value: string | null | undefined) {
  if (value === undefined) return undefined
  return value === null ? null : new Prisma.Decimal(value)
}

export async function createCampaignLaunch(input: CreateCampaignLaunchInput) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await db.$transaction(async (tx) => {
        const existing = await tx.campaignLaunch.findMany({
          where: { organizationId: input.organizationId },
          select: { code: true },
        })
        const launch = await tx.campaignLaunch.create({
          data: {
            organizationId: input.organizationId,
            code: nextCampaignLaunchCode(existing.map((item) => item.code)),
            title: input.title,
            brief: input.brief,
            priority: input.priority ?? 'P2',
            budgetCap: budgetValue(input.budgetCap),
          },
        })

        await tx.campaignPolicy.upsert({
          where: { organizationId: input.organizationId },
          update: {},
          create: { organizationId: input.organizationId },
        })
        await tx.outboxMessage.create({
          data: {
            organizationId: input.organizationId,
            aggregateType: 'CampaignLaunch',
            aggregateId: launch.id,
            aggregateVersion: launch.version,
            eventType: 'CAMPAIGN_LAUNCH_CREATED',
            deduplicationKey: campaignOutboxKey(launch.id, 'CAMPAIGN_LAUNCH_CREATED', launch.version),
            payload: { launchId: launch.id, code: launch.code },
          },
        })
        return launch
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } catch (error) {
      if (!isTransactionRetry(error) || attempt === 4) throw error
    }
  }
  throw new Error('Campaign launch could not be created')
}

export function listCampaignLaunches(organizationId: string) {
  return db.campaignLaunch.findMany({
    where: { organizationId },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { items: true, validations: true, revisions: true } },
    },
  })
}

export function getCampaignLaunch(organizationId: string, id: string) {
  return db.campaignLaunch.findFirst({
    where: { id, organizationId },
    include: {
      items: {
        orderBy: { orderNum: 'asc' },
        include: { assignee: true, issue: true, dependencies: true, requiredBy: true },
      },
      validations: true,
      revisions: { orderBy: { revisionNum: 'desc' }, include: { publishLogs: true } },
      approvals: { orderBy: { createdAt: 'desc' } },
    },
  })
}

export async function updateCampaignLaunch(input: UpdateCampaignLaunchInput) {
  return db.$transaction(async (tx) => {
    const current = await tx.campaignLaunch.findFirst({
      where: { id: input.id, organizationId: input.organizationId },
    })
    if (!current) throw new Error('Campaign launch not found')
    if (current.version !== input.expectedVersion) throw new Error('Campaign launch changed; reload before updating')
    if (input.status) {
      assertUserManagedCampaignStatus(input.status)
      assertCampaignLaunchTransition(current.status, input.status)
    }

    const nextVersion = current.version + 1
    const updated = await tx.campaignLaunch.updateMany({
      where: { id: current.id, organizationId: input.organizationId, version: input.expectedVersion },
      data: {
        title: input.title,
        brief: input.brief,
        priority: input.priority,
        budgetCap: budgetValue(input.budgetCap),
        status: input.status,
        version: { increment: 1 },
        startedAt: input.status === 'EXECUTING' && !current.startedAt ? new Date() : undefined,
        completedAt: input.status === 'PUBLISHED' ? new Date() : undefined,
        cancelledAt: input.status === 'CANCELLED' ? new Date() : undefined,
      },
    })
    if (updated.count !== 1) throw new Error('Campaign launch changed; reload before updating')

    const eventType = input.status ? 'CAMPAIGN_LAUNCH_STATUS_CHANGED' : 'CAMPAIGN_LAUNCH_UPDATED'
    await tx.outboxMessage.create({
      data: {
        organizationId: input.organizationId,
        aggregateType: 'CampaignLaunch',
        aggregateId: current.id,
        aggregateVersion: nextVersion,
        eventType,
        deduplicationKey: campaignOutboxKey(current.id, eventType, nextVersion),
        payload: {
          launchId: current.id,
          previousStatus: current.status,
          status: input.status ?? current.status,
        },
      },
    })

    return tx.campaignLaunch.findUniqueOrThrow({ where: { id: current.id } })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}
