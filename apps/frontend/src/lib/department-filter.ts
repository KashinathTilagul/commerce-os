import { db } from '@/lib/db'

export enum Department {
  EXECUTIVE = 'EXECUTIVE',
  CREATIVE = 'CREATIVE',
  MARKETING = 'MARKETING',
  TECHNOLOGY = 'TECHNOLOGY',
  FINANCE = 'FINANCE',
  OPERATIONS = 'OPERATIONS',
  SALES = 'SALES',
  HUMAN_RESOURCES = 'HUMAN_RESOURCES',
}

export interface DepartmentFilterResult {
  issues: any[]
  agents: any[]
  campaigns: any[]
  approvals: any[]
  events: any[]
  workflows: any[]
  goals: any[]
  skills: any[]
}

export class VirtualHQFilter {
  /**
   * Filter all organizational data by department
   */
  async filterByDepartment(
    organizationId: string,
    department: Department
  ): Promise<DepartmentFilterResult> {
    const result: DepartmentFilterResult = {
      issues: [],
      agents: [],
      campaigns: [],
      approvals: [],
      events: [],
      workflows: [],
      goals: [],
      skills: [],
    }

    // Filter issues by department
    result.issues = await db.issue.findMany({
      where: {
        organizationId,
        department,
      },
      include: {
        assignedAgent: {
          select: {
            id: true,
            name: true,
            code: true,
            avatarColor: true,
            role: true,
          },
        },
        comments: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Filter agents by department (based on role)
    const departmentRoles = this.getRolesForDepartment(department)
    result.agents = await db.agent.findMany({
      where: {
        organizationId,
        role: { in: departmentRoles },
      },
      include: {
        runs: {
          where: {
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
          },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    })

    // Filter campaigns by department
    result.campaigns = await db.campaign.findMany({
      where: {
        organizationId,
        department,
      },
      include: {
        launches: {
          take: 3,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    // Filter approvals related to department
    result.approvals = await db.approval.findMany({
      where: {
        organizationId,
        requester: {
          role: { in: departmentRoles },
        },
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            code: true,
            role: true,
          },
        },
        campaignLaunch: {
          select: {
            id: true,
            code: true,
            status: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    // Filter events by department (agent-based filtering)
    const agentIds = result.agents.map(a => a.id)
    if (agentIds.length > 0) {
      result.events = await db.event.findMany({
        where: {
          organizationId,
          actorId: { in: agentIds },
        },
        orderBy: { timestamp: 'desc' },
        take: 50,
      })
    }

    // Filter workflows by department
    result.workflows = await db.workflow.findMany({
      where: {
        organizationId,
        // Filter based on workflow metadata or task assignments
        tasks: {
          some: {
            assigneeId: { in: agentIds },
          },
        },
      },
      include: {
        tasks: {
          where: {
            assigneeId: { in: agentIds },
          },
          take: 10,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    // Filter goals by department
    result.goals = await db.goal.findMany({
      where: {
        organizationId,
        department,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { targetDate: 'asc' },
      take: 20,
    })

    // Filter skills by department
    result.skills = await db.skill.findMany({
      where: {
        organizationId,
        department,
      },
      orderBy: { name: 'asc' },
    })

    return result
  }

  /**
   * Get department overview statistics
   */
  async getDepartmentOverview(
    organizationId: string,
    department: Department
  ) {
    const departmentRoles = this.getRolesForDepartment(department)

    const [
      activeIssues,
      completedIssues,
      activeAgents,
      activeCampaigns,
      pendingApprovals,
      recentEvents,
    ] = await Promise.all([
      db.issue.count({
        where: {
          organizationId,
          department,
          status: { in: ['BACKLOG', 'IN_PROGRESS', 'BLOCKED'] },
        },
      }),
      db.issue.count({
        where: {
          organizationId,
          department,
          status: 'DONE',
          completedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
        },
      }),
      db.agent.count({
        where: {
          organizationId,
          role: { in: departmentRoles },
        },
      }),
      db.campaign.count({
        where: {
          organizationId,
          department,
          status: { in: ['ACTIVE', 'PLANNING'] },
        },
      }),
      db.approval.count({
        where: {
          organizationId,
          status: 'PENDING',
          requester: {
            role: { in: departmentRoles },
          },
        },
      }),
      db.event.count({
        where: {
          organizationId,
          timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
          actor: {
            role: { in: departmentRoles },
          },
        },
      }),
    ])

    return {
      department,
      activeIssues,
      completedIssues,
      activeAgents,
      activeCampaigns,
      pendingApprovals,
      recentEvents,
      utilizationRate: activeAgents > 0 ? (activeIssues / activeAgents) * 100 : 0,
    }
  }

  /**
   * Get all departments with their overviews
   */
  async getAllDepartmentsOverview(organizationId: string) {
    const departments = Object.values(Department)
    const overviews = await Promise.all(
      departments.map(dept => this.getDepartmentOverview(organizationId, dept as Department))
    )

    return overviews
  }

  /**
   * Map departments to agent roles
   */
  private getRolesForDepartment(department: Department): string[] {
    const roleMapping: Record<Department, string[]> = {
      [Department.EXECUTIVE]: ['CEO', 'CFO', 'CTO', 'CMO', 'COO', 'PRESIDENT'],
      [Department.CREATIVE]: ['CREATIVE_DIRECTOR', 'DESIGNER', 'ART_DIRECTOR', 'CONTENT_CREATOR'],
      [Department.MARKETING]: ['CMO', 'MARKETING_MANAGER', 'SOCIAL_MEDIA_MANAGER', 'BRAND_MANAGER'],
      [Department.TECHNOLOGY]: ['CTO', 'ENGINEER', 'DEVELOPER', 'SYSTEM_ADMIN', 'DATA_SCIENTIST'],
      [Department.FINANCE]: ['CFO', 'ACCOUNTANT', 'FINANCIAL_ANALYST', 'CONTROLLER'],
      [Department.OPERATIONS]: ['COO', 'OPERATIONS_MANAGER', 'LOGISTICS_MANAGER', 'SUPPLY_CHAIN_MANAGER'],
      [Department.SALES]: ['SALES_DIRECTOR', 'SALES_MANAGER', 'ACCOUNT_EXECUTIVE', 'BUSINESS_DEVELOPMENT'],
      [Department.HUMAN_RESOURCES]: ['HR_DIRECTOR', 'HR_MANAGER', 'RECRUITER', 'PEOPLE_OPERATIONS'],
    }

    return roleMapping[department] || []
  }

  /**
   * Get workspace-specific filter (Virtual HQ rooms)
   */
  async filterWorkspace(
    organizationId: string,
    workspaceType: 'BOARD_ROOM' | 'MISSION_CONTROL' | 'FOUNDER_INBOX' | 'RISK_CENTER'
  ) {
    switch (workspaceType) {
      case 'BOARD_ROOM':
        return this.getBoardRoomData(organizationId)
      case 'MISSION_CONTROL':
        return this.getMissionControlData(organizationId)
      case 'FOUNDER_INBOX':
        return this.getFounderInboxData(organizationId)
      case 'RISK_CENTER':
        return this.getRiskCenterData(organizationId)
      default:
        throw new Error(`Unknown workspace type: ${workspaceType}`)
    }
  }

  private async getBoardRoomData(organizationId: string) {
    const executives = await db.agent.findMany({
      where: {
        organizationId,
        role: { in: ['CEO', 'CFO', 'CTO', 'CMO', 'COO'] },
      },
      orderBy: { name: 'asc' },
    })

    const kpis = await db.issue.findMany({
      where: {
        organizationId,
        priority: 'P0',
        status: { in: ['BACKLOG', 'IN_PROGRESS'] },
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    })

    return { executives, kpis }
  }

  private async getMissionControlData(organizationId: string) {
    const activeIssues = await db.issue.findMany({
      where: {
        organizationId,
        status: { in: ['BACKLOG', 'IN_PROGRESS', 'BLOCKED'] },
      },
      include: {
        assignedAgent: {
          select: {
            id: true,
            name: true,
            code: true,
            avatarColor: true,
          },
        },
      },
      orderBy: { priority: 'asc' },
      take: 50,
    })

    const activeWorkflows = await db.workflow.findMany({
      where: {
        organizationId,
        status: { in: ['PLANNING', 'RUNNING'] },
      },
      include: {
        tasks: {
          take: 5,
        },
      },
      take: 10,
    })

    return { activeIssues, activeWorkflows }
  }

  private async getFounderInboxData(organizationId: string) {
    const pendingApprovals = await db.approval.findMany({
      where: {
        organizationId,
        status: 'PENDING',
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            code: true,
            role: true,
          },
        },
        campaignLaunch: true,
        campaignRevision: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const escalatedIssues = await db.issue.findMany({
      where: {
        organizationId,
        priority: 'P0',
        status: { in: ['BLOCKED', 'IN_PROGRESS'] },
      },
      include: {
        assignedAgent: true,
      },
      take: 10,
    })

    return { pendingApprovals, escalatedIssues }
  }

  private async getRiskCenterData(organizationId: string) {
    const risks = await db.issue.findMany({
      where: {
        organizationId,
        priority: 'P0',
        status: 'BLOCKED',
      },
      include: {
        assignedAgent: true,
        comments: {
          take: 3,
          orderBy: { createdAt: 'desc' },
        },
      },
      take: 20,
    })

    const recentFailures = await db.agentRun.findMany({
      where: {
        organizationId,
        status: 'FAILED',
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      include: {
        agent: true,
        issue: true,
      },
      take: 20,
    })

    return { risks, recentFailures }
  }
}

// Singleton instance
export const virtualHQFilter = new VirtualHQFilter()