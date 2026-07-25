import { db } from '@/lib/db'
import { CommerceMapper } from './mapper'
import { KnowledgePipeline } from '@/lib/knowledge/pipeline'

export class CommerceHub {
  static async persistProduct(raw: any, orgId: string, provider: string) {
    const canonical = CommerceMapper.toCanonicalProduct(raw, orgId)
    const externalId = String(raw.id)
    const checksum = CommerceMapper.generateChecksum(raw)

    const link = await db.commerceObjectLink.findUnique({
      where: {
        organizationId_provider_entityType_externalId: {
          organizationId: orgId,
          provider,
          entityType: 'PRODUCT',
          externalId,
        },
      },
    })

    if (link && link.checksum === checksum) {
      return { status: 'UNCHANGED' }
    }

    let internalId = link?.internalId

    if (internalId) {
      await db.product.update({
        where: { id: internalId },
        data: canonical,
      })
    } else {
      const p = await db.product.upsert({
        where: { organizationId_sku: { organizationId: orgId, sku: canonical.sku } },
        create: canonical,
        update: canonical,
      })
      internalId = p.id
    }

    await db.commerceObjectLink.upsert({
      where: {
        organizationId_provider_entityType_externalId: {
          organizationId: orgId,
          provider,
          entityType: 'PRODUCT',
          externalId,
        },
      },
      create: {
        organizationId: orgId,
        provider,
        entityType: 'PRODUCT',
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

    // Knowledge Graph Update
    await KnowledgePipeline.ingest({
      organizationId: orgId,
      source: 'COMMERCE',
      sourceProvider: provider,
      businessObjectType: 'PRODUCT',
      businessObjectId: internalId,
      rawObject: canonical
    })

    return { status: link ? 'UPDATED' : 'CREATED', internalId }
  }

  static async persistOrder(raw: any, orgId: string, provider: string) {
    const canonical = CommerceMapper.toCanonicalOrder(raw, orgId)
    const externalId = String(raw.id)
    const checksum = CommerceMapper.generateChecksum(raw)

    const link = await db.commerceObjectLink.findUnique({
      where: {
        organizationId_provider_entityType_externalId: {
          organizationId: orgId,
          provider,
          entityType: 'ORDER',
          externalId,
        },
      },
    })

    if (link && link.checksum === checksum) {
      return { status: 'UNCHANGED' }
    }

    let internalId = link?.internalId

    if (internalId) {
      await db.order.update({
        where: { id: internalId },
        data: canonical,
      })
    } else {
      const o = await db.order.upsert({
        where: { organizationId_orderNumber: { organizationId: orgId, orderNumber: canonical.orderNumber } },
        create: canonical,
        update: canonical,
      })
      internalId = o.id
    }

    await db.commerceObjectLink.upsert({
      where: {
        organizationId_provider_entityType_externalId: {
          organizationId: orgId,
          provider,
          entityType: 'ORDER',
          externalId,
        },
      },
      create: {
        organizationId: orgId,
        provider,
        entityType: 'ORDER',
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
      businessObjectType: 'ORDER',
      businessObjectId: internalId,
      rawObject: canonical
    })

    return { status: link ? 'UPDATED' : 'CREATED', internalId }
  }

  static async persistCustomer(raw: any, orgId: string, provider: string) {
    const canonical = CommerceMapper.toCanonicalCustomer(raw, orgId)
    const externalId = String(raw.id)
    const checksum = CommerceMapper.generateChecksum(raw)

    const link = await db.commerceObjectLink.findUnique({
      where: {
        organizationId_provider_entityType_externalId: {
          organizationId: orgId,
          provider,
          entityType: 'CUSTOMER',
          externalId,
        },
      },
    })

    if (link && link.checksum === checksum) {
      return { status: 'UNCHANGED' }
    }

    let internalId = link?.internalId

    if (internalId) {
      await db.customer.update({
        where: { id: internalId },
        data: canonical,
      })
    } else {
      const c = await db.customer.upsert({
        where: { organizationId_email: { organizationId: orgId, email: canonical.email } },
        create: canonical,
        update: canonical,
      })
      internalId = c.id
    }

    await db.commerceObjectLink.upsert({
      where: {
        organizationId_provider_entityType_externalId: {
          organizationId: orgId,
          provider,
          entityType: 'CUSTOMER',
          externalId,
        },
      },
      create: {
        organizationId: orgId,
        provider,
        entityType: 'CUSTOMER',
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
      businessObjectType: 'CUSTOMER',
      businessObjectId: internalId,
      rawObject: canonical
    })

    return { status: link ? 'UPDATED' : 'CREATED', internalId }
  }
}
