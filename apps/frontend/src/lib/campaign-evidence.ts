import { Prisma } from '@prisma/client'
import { db } from './db'
import { hashCampaignEvidence } from './campaign-evidence-hash'

export { hashCampaignEvidence } from './campaign-evidence-hash'

export async function freezeCampaignRevision(organizationId: string, launchId: string) {
  return db.$transaction(async (tx) => {
    const launch = await tx.campaignLaunch.findFirst({
      where: { id: launchId, organizationId },
      include: {
        items: {
          orderBy: { orderNum: 'asc' },
          include: { issue: { include: { comments: { orderBy: { createdAt: 'desc' }, take: 1 } } } },
        },
        validations: { orderBy: [{ domain: 'asc' }, { scopeKey: 'asc' }] },
        revisions: { orderBy: { revisionNum: 'desc' }, take: 1 },
      },
    })
    if (!launch) throw new Error('Campaign launch not found')
    if (launch.items.some((item) => item.status !== 'COMPLETED')) throw new Error('Every campaign item must be completed before freezing')
    if (launch.validations.some((validation) => validation.status !== 'PASS')) throw new Error('Every campaign validation must pass before freezing')
    const commerceDraft = launch.items.find((item) => item.code === '13')?.providerDraft
    if (!commerceDraft) throw new Error('Shopify commerce draft is missing')

    const artifactIds = new Set<string>()
    const items = launch.items.map((item) => {
      const output = item.issue?.comments[0]?.body ?? ''
      for (const match of output.matchAll(/\/api\/artifacts\/([A-Za-z0-9_-]+)/g)) artifactIds.add(match[1])
      return {
        code: item.code,
        type: item.type,
        status: item.status,
        issueCode: item.issue?.code ?? null,
        issueStatus: item.issue?.status ?? null,
        output,
        providerDraft: item.providerDraft,
      }
    })
    const artifacts = artifactIds.size ? await tx.artifact.findMany({
      where: { organizationId, id: { in: [...artifactIds] } },
      select: { id: true, title: true, type: true, mimeType: true, contentHash: true, byteSize: true },
      orderBy: { id: 'asc' },
    }) : []
    const evidence = {
      launch: { id: launch.id, code: launch.code, title: launch.title, brief: launch.brief },
      items,
      validations: launch.validations.map((validation) => ({
        scopeKey: validation.scopeKey,
        domain: validation.domain,
        status: validation.status,
        evidenceJson: validation.evidenceJson,
      })),
      artifacts,
    }
    const versionHash = hashCampaignEvidence(evidence)
    const existing = await tx.campaignRevision.findFirst({ where: { launchId, versionHash } })
    if (existing) return existing
    return tx.campaignRevision.create({
      data: {
        launchId,
        revisionNum: (launch.revisions[0]?.revisionNum ?? 0) + 1,
        versionHash,
        evidenceJson: evidence as Prisma.InputJsonValue,
        approvalMode: 'FOUNDER',
      },
    })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}
