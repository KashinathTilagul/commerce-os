import { db } from '@/lib/db'

export class PromptRegistry {
  static async getPrompt(name: string, organizationId: string, version?: string) {
    const where: any = { name, organizationId }
    if (version) {
      where.version = version
    }

    const prompts = await db.prompt.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 1
    })

    if (prompts.length === 0) {
      throw new Error(`Prompt [${name}] not found in registry.`)
    }

    return prompts[0]
  }

  static async registerPrompt(data: {
    organizationId: string
    name: string
    version: string
    department: string
    variables: string[]
    systemPrompt: string
    developerPrompt: string
  }) {
    return await db.prompt.upsert({
      where: {
        organizationId_name_version: {
          organizationId: data.organizationId,
          name: data.name,
          version: data.version
        }
      },
      create: {
        ...data,
        variables: JSON.stringify(data.variables)
      },
      update: {
        ...data,
        variables: JSON.stringify(data.variables)
      }
    })
  }
}
