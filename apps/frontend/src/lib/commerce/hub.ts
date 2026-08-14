import { db } from '@/lib/db'
import { CommerceMapper } from './mapper'
import { KnowledgePipeline } from '@/lib/knowledge/pipeline'

type EntityType = 'PRODUCT' | 'ORDER' | 'CUSTOMER'

interface PersistParams {
  raw: any
  orgId: string
  provider: string
  entityType: EntityType
  toCanonical: (raw: any, orgId: string) => any
  uniqueKey: (orgId: string, canonical: any) => any
}

// ponytail: three persist methods share 70% structure — extracted common pattern
async function persistEntity(params: PersistParams) {
  const { raw, orgId, provider, entityType, toCanonical, uniqueKey } = params
  const canonical = toCanonical(raw, orgId)
  const externalId = String(raw.id)
  const checksum = CommerceMapper.generateChecksum(raw)

  const link = await db.commerceObjectLink.findUnique({
    where: {
      organizationId_provider_entityType_externalId: {
        organizationId: orgId,
        provider,
        entityType,
        externalId,
      },
    },
  })

  if (link && link.checksum === checksum) {
    return { status: 'UNCHANGED' }
  }

  let internalId = link?.internalId

  if (internalId) {
    const updateOps: Record<EntityType, () => Promise<any>> = {
      PRODUCT: () => db.product.update({ where: { id: internalId }, data: canonical }),
      ORDER: () => db.order.update({ where: { id: internalId }, data: canonical }),
      CUSTOMER: () => db.customer.update({ where: { id: internalId }, data: canonical }),
    }
    await updateOps[entityType]()
  } else {
    const upsertOps: Record<EntityType, () => Promise<{ id: string }>> = {
      PRODUCT: () => db.product.upsert({
        where: { organizationId_sku: uniqueKey(orgId, canonical) },
        create: canonical,
        update: canonical,
      }),
      ORDER: () => db.order.upsert({
        where: { organizationId_orderNumber: uniqueKey(orgId, canonical) },
        create: canonical,
        update: canonical,
      }),
      CUSTOMER: () => db.customer.upsert({
        where: { organizationId_email: uniqueKey(orgId, canonical) },
        create: canonical,
        update: canonical,
      }),
    }
    const result = await upsertOps[entityType]()
    internalId = result.id
  }

  await db.commerceObjectLink.upsert({
    where: {
      organizationId_provider_entityType_externalId: {
        organizationId: orgId,
        provider,
        entityType,
        externalId,
      },
    },
    create: {
      organizationId: orgId,
      provider,
      entityType,
      externalId,
      internalId,
      checksum,
    },
    update: {
      internalId,
      checksum,
      syncedAt: new Date(),
    },
  })

  await KnowledgePipeline.ingest({
    organizationId: orgId,
    source: 'COMMERCE',
    sourceProvider: provider,
    businessObjectType: entityType,
    businessObjectId: internalId,
    rawObject: canonical,
  })

  return { status: link ? 'UPDATED' : 'CREATED', internalId }
}

export class CommerceHub {
  static async persistProduct(raw: any, orgId: string, provider: string) {
    return persistEntity({
      raw,
      orgId,
      provider,
      entityType: 'PRODUCT',
      toCanonical: CommerceMapper.toCanonicalProduct,
      uniqueKey: (orgId, canonical) => ({ organizationId: orgId, sku: canonical.sku }),
    })
  }

  static async persistOrder(raw: any, orgId: string, provider: string) {
    return persistEntity({
      raw,
      orgId,
      provider,
      entityType: 'ORDER',
      toCanonical: CommerceMapper.toCanonicalOrder,
      uniqueKey: (orgId, canonical) => ({ organizationId: orgId, orderNumber: canonical.orderNumber }),
    })
  }

  static async persistCustomer(raw: any, orgId: string, provider: string) {
    return persistEntity({
      raw,
      orgId,
      provider,
      entityType: 'CUSTOMER',
      toCanonical: CommerceMapper.toCanonicalCustomer,
      uniqueKey: (orgId, canonical) => ({ organizationId: orgId, email: canonical.email }),
    })
  }
}
