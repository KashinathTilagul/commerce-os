import { db } from '@/lib/db'

export async function registerCapabilities(organizationId: string, agentId: string, capabilities: any[]) {
  const creates = capabilities.map(cap => ({
    organizationId,
    ownerId: agentId,
    name: cap.name,
    description: cap.description,
    category: cap.category || 'general',
    ownerType: cap.ownerType || 'AGENT',
    requiredPermissions: cap.requiredPermissions || '',
    costEstimate: cap.costEstimate || 'low',
    latencyClass: cap.latencyClass || 'fast',
    dependencies: cap.dependencies || '',
    health: cap.health ?? 100,
    availability: cap.availability || 'ONLINE',
    inputSchema: cap.inputSchema || null,
    outputSchema: cap.outputSchema || null,
    version: cap.version || '1.0'
  }))

  const results: any[] = []
  for (const c of creates) {
    const res = await db.capability.upsert({
      where: { organizationId_name: { organizationId, name: c.name } },
      update: c,
      create: c
    })
    results.push(res)
  }
  return results
}

export async function queryCapabilities(organizationId: string, options: { category?: string, search?: string, availability?: string }) {
  const where: any = { organizationId }
  if (options.category) where.category = options.category
  if (options.availability) where.availability = options.availability
  if (options.search) {
    where.OR = [
      { name: { contains: options.search } },
      { description: { contains: options.search } }
    ]
  }

  return db.capability.findMany({ where })
}

export async function findCapabilityForIntent(organizationId: string, intent: string) {
  const searchWords = intent.split(' ').filter(w => w.length > 3)
  const where: any = { organizationId, availability: 'ONLINE' }
  if (searchWords.length > 0) {
    where.OR = searchWords.flatMap(w => [
      { name: { contains: w } },
      { description: { contains: w } }
    ])
  }
  
  const matches = await db.capability.findMany({
    where,
    include: { owner: true }
  })
  
  return matches[0] || null
}

export async function updateHealth(capabilityId: string, health: number) {
  return db.capability.update({
    where: { id: capabilityId },
    data: { health }
  })
}

export async function updateAvailability(capabilityId: string, availability: string) {
  return db.capability.update({
    where: { id: capabilityId },
    data: { availability }
  })
}
