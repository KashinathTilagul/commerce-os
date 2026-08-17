import {
  Prisma,
  type CampaignLaunchStatus,
  type CampaignPriority,
} from '@prisma/client'
import { db } from './db'
import { nextCampaignLaunchCode } from './campaign-launch-code'
import { campaignOutboxKey } from './campaign-outbox-key'
import { assertCampaignLaunchTransition, assertUserManagedCampaignStatus } from './campaign-state'
import { CAMPAIGN_ITEMS, CAMPAIGN_VALIDATIONS } from './campaign-blueprint'
import type { WorkItemDefinition, WorkValidationDefinition } from './work-request-planner'

export interface CreateCampaignLaunchInput {
  organizationId: string
  title: string
  brief: string
  priority?: CampaignPriority
  budgetCap?: string | null
  hidden?: boolean
  items?: WorkItemDefinition[]
  validations?: WorkValidationDefinition[]
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
            hidden: input.hidden ?? false,
            status: 'EXECUTING',
            startedAt: new Date(),
          },
        })

        const itemDefinitions: WorkItemDefinition[] = input.items ?? CAMPAIGN_ITEMS.map((item) => ({ ...item, dependsOn: [...item.dependsOn] }))
        const validationDefinitions: WorkValidationDefinition[] = input.validations ?? CAMPAIGN_VALIDATIONS.map((validation) => ({ ...validation }))
        const agentCodes = [...new Set([
          ...itemDefinitions.flatMap((item) => item.assigneeCode ? [item.assigneeCode] : []),
          ...validationDefinitions.map((validation) => validation.validatorCode),
        ])]
        const agents = await tx.agent.findMany({
          where: { organizationId: input.organizationId, code: { in: agentCodes } },
        })
        const agentByCode = new Map(agents.map((agent) => [agent.code, agent]))
        const missing = agentCodes.filter((code) => !agentByCode.has(code))
        if (missing.length) throw new Error(`Workforce roster is incomplete: ${missing.join(', ')}`)

        const itemByCode = new Map<string, { id: string; issueId: string | null }>()
        for (const [index, definition] of itemDefinitions.entries()) {
          const assignee = definition.assigneeCode ? agentByCode.get(definition.assigneeCode) : null
          const issue = assignee ? await tx.issue.create({
            data: {
              organizationId: input.organizationId,
              code: `PAP-${launch.code.slice(3)}-${definition.code}`,
              title: `${launch.code} · ${definition.title}`,
              description: `${definition.title} for campaign: ${input.brief}`,
              status: definition.dependsOn.length === 0 ? 'BACKLOG' : 'BLOCKED',
              priority: input.priority ?? 'P2',
              type: definition.type,
              department: assignee.department,
              assigneeId: assignee.id,
              blockedByIds: definition.dependsOn.map((code) => `${launch.code}-${code}`).join(','),
            },
          }) : null
          const item = await tx.campaignLaunchItem.create({
            data: {
              launchId: launch.id,
              code: definition.code,
              type: definition.type,
              title: definition.title,
              description: `${definition.title} for ${launch.title}`,
              status: definition.dependsOn.length === 0 ? 'READY' : 'PENDING',
              orderNum: index + 1,
              assigneeType: assignee ? 'AGENT' : 'SYSTEM',
              assigneeId: assignee?.id,
              serviceKey: definition.serviceKey,
              issueId: issue?.id,
              executionKey: `${launch.id}:${definition.code}`,
            },
          })
          itemByCode.set(definition.code, { id: item.id, issueId: issue?.id ?? null })
        }
        await tx.campaignLaunchDependency.createMany({
          data: itemDefinitions.flatMap((item) => item.dependsOn.map((code) => ({
            itemId: itemByCode.get(item.code)!.id,
            dependsOnId: itemByCode.get(code)!.id,
          }))),
        })
        await tx.campaignValidation.createMany({
          data: validationDefinitions.map((validation) => ({
            launchId: launch.id,
            itemId: validation.itemCode ? itemByCode.get(validation.itemCode)?.id : undefined,
            scopeKey: validation.itemCode ? `ITEM-${validation.itemCode}` : 'LAUNCH',
            domain: validation.domain,
            validatorAgentId: agentByCode.get(validation.validatorCode)!.id,
          })),
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

export function listCampaignLaunches(organizationId: string, options?: { includeHidden?: boolean }) {
  return db.campaignLaunch.findMany({
    // Silent-research launches are invisible in founder surfaces unless the
    // founder explicitly asks for them (includeHidden from the API query).
    where: { organizationId, status: { not: 'CANCELLED' }, ...(options?.includeHidden ? {} : { hidden: false }) },
    orderBy: { updatedAt: 'desc' },
    take: 20,
    include: {
      items: {
        orderBy: { orderNum: 'asc' },
        include: {
          assignee: { select: { id: true, code: true, name: true, avatarColor: true } },
          issue: { select: { code: true, status: true, comments: { orderBy: { createdAt: 'desc' }, take: 1 } } },
        },
      },
      validations: { include: { validatorAgent: { select: { code: true, name: true } } } },
      revisions: { orderBy: { revisionNum: 'desc' }, take: 1, include: { publishLogs: { orderBy: { createdAt: 'asc' } } } },
      approvals: { orderBy: { createdAt: 'desc' }, take: 1 },
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
        include: {
          assignee: true,
          issue: { include: { comments: { orderBy: { createdAt: 'desc' } } } },
          dependencies: true,
          requiredBy: true,
        },
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

    if (input.status === 'CANCELLED') {
      const linkedItems = await tx.campaignLaunchItem.findMany({
        where: { launchId: current.id },
        select: { issueId: true },
      })
      const issueIds = linkedItems.flatMap((item) => item.issueId ? [item.issueId] : [])
      await tx.campaignLaunchItem.updateMany({
        where: { launchId: current.id, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        data: { status: 'CANCELLED', leaseOwnerId: null, leaseExpiresAt: null },
      })
      if (issueIds.length) {
        await tx.issue.updateMany({
          where: { organizationId: input.organizationId, id: { in: issueIds }, status: { notIn: ['DONE', 'CANCELLED'] } },
          data: { status: 'CANCELLED' },
        })
      }
    }

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
