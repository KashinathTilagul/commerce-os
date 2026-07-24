import { db } from '@/lib/db'

export async function storeContext(
  userId: string,
  params: {
    source: string
    summary: string
    fullData: any
    metadata?: any
    ttl?: number
  }
) {
  const handle = `${params.source}_${Date.now().toString(36)}`
  
  await db.contextEntry.create({
    data: {
      userId,
      handle,
      source: params.source,
      summary: params.summary,
      fullData: JSON.stringify(params.fullData),
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      ttl: params.ttl ?? 3600,
    }
  })

  return handle
}

export async function retrieveContext(userId: string, handle: string) {
  const entry = await db.contextEntry.findUnique({
    where: { userId_handle: { userId, handle } }
  })

  if (!entry) return null

  const now = new Date()
  const age = (now.getTime() - entry.createdAt.getTime()) / 1000
  if (age > entry.ttl) {
    await db.contextEntry.delete({ where: { id: entry.id } })
    return null
  }

  return {
    ...entry,
    fullData: JSON.parse(entry.fullData),
    metadata: entry.metadata ? JSON.parse(entry.metadata) : null
  }
}

export async function searchContext(userId: string, query: string, limit: number = 10) {
  const entries = await db.contextEntry.findMany({
    where: {
      userId,
      OR: [
        { summary: { contains: query } },
        { metadata: { contains: query } },
        { source: { contains: query } }
      ]
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  })

  const now = new Date()
  const validEntries: any[] = []

  for (const entry of entries) {
    const age = (now.getTime() - entry.createdAt.getTime()) / 1000
    if (age > entry.ttl) {
      await db.contextEntry.delete({ where: { id: entry.id } })
    } else {
      validEntries.push({
        ...entry,
        metadata: entry.metadata ? JSON.parse(entry.metadata) : null
      })
    }
  }

  return validEntries
}

export function summarizeQueryResult(data: any[], entityName: string) {
  if (!Array.isArray(data) || data.length === 0) {
    return {
      entity: entityName,
      count: 0,
      summary: "No data available."
    }
  }

  const count = data.length
  
  return {
    entity: entityName,
    count,
    sampleKeys: Object.keys(data[0] || {}),
    summary: `Collection of ${count} ${entityName} records.`,
  }
}

export async function expireContext() {
  const entries = await db.contextEntry.findMany({
    select: { id: true, createdAt: true, ttl: true }
  })
  const now = new Date().getTime()
  
  const idsToDelete = entries.filter(e => {
    return (now - e.createdAt.getTime()) / 1000 > e.ttl
  }).map(e => e.id)
  
  if (idsToDelete.length > 0) {
    await db.contextEntry.deleteMany({
      where: { id: { in: idsToDelete } }
    })
  }
  return idsToDelete.length
}
