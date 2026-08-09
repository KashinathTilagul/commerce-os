import type { PrismaClient } from '@prisma/client'
import { ROSTER } from './agent-roster'

type RosterDb = Pick<PrismaClient, 'agent'>

export async function syncAgentRoster(client: RosterDb, organizationId: string) {
  const codeToId = new Map<string, string>()

  for (const employee of ROSTER.filter((agent) => agent.managerCode === null)) {
    const fields = {
      name: employee.name,
      role: employee.role,
      department: employee.department,
      primeDirective: employee.primeDirective,
      skills: employee.skills,
      avatarColor: employee.avatarColor,
      managerId: null,
    }
    const agent = await client.agent.upsert({
      where: { organizationId_code: { organizationId, code: employee.code } },
      update: fields,
      create: { organizationId, code: employee.code, description: employee.role, tokenBudget: 50000, ...fields },
    })
    codeToId.set(employee.code, agent.id)
  }

  for (const employee of ROSTER.filter((agent) => agent.managerCode !== null)) {
    const fields = {
      name: employee.name,
      role: employee.role,
      department: employee.department,
      primeDirective: employee.primeDirective,
      skills: employee.skills,
      avatarColor: employee.avatarColor,
      managerId: employee.managerCode ? codeToId.get(employee.managerCode) ?? null : null,
    }
    await client.agent.upsert({
      where: { organizationId_code: { organizationId, code: employee.code } },
      update: fields,
      create: { organizationId, code: employee.code, description: employee.role, tokenBudget: 50000, ...fields },
    })
  }

  return ROSTER.length
}
