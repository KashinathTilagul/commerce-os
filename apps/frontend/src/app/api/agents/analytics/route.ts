export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { applyRateLimit } from '@/lib/rate-limiter'

interface AgentPerformanceMetrics {
  agentId: string
  agentName: string
  agentCode: string
  agentRole: string
  totalTasks: number
  completedTasks: number
  failedTasks: number
  successRate: number
  averageCompletionTime: number
  totalTokensUsed: number
  qualityScore: number
  activeRuns: number
  recentActivity: Array<{
    taskId: string
    status: string
    completedAt: Date
    duration: number
  }>
  skillUsage: Record<string, number>
  departmentPerformance: Record<string, {
    totalTasks: number
    successRate: number
    averageTime: number
  }>
}

export async function GET(request: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  // Apply rate limiting
  const rateLimitResult = await applyRateLimit(
    `${auth.organizationId}:${auth.user.id}`,
    'API',
    request
  )
  
  if (!rateLimitResult.success && rateLimitResult.errorResponse) {
    const response = NextResponse.json(
      rateLimitResult.errorResponse.body,
      { status: rateLimitResult.errorResponse.status }
    )
    
    Object.entries(rateLimitResult.errorResponse.headers).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
  }

  try {
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '7d' // 7d, 30d, 90d
    const agentId = searchParams.get('agentId')

    const now = new Date()
    const startDate = new Date()
    
    switch (timeframe) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      default:
        startDate.setDate(now.getDate() - 7)
    }

    const whereClause: any = {
      organizationId: auth.organizationId,
      createdAt: { gte: startDate },
    }

    if (agentId) {
      whereClause.agentId = agentId
    }

    // Get all agents
    const agents = await db.agent.findMany({
      where: { organizationId: auth.organizationId },
      select: {
        id: true,
        name: true,
        code: true,
        role: true,
        qualityScore: true,
      },
    })

    // Get agent runs with issue data
    const agentRuns = await db.agentRun.findMany({
      where: whereClause,
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            code: true,
            role: true,
            qualityScore: true,
          },
        },
        issue: {
          select: {
            id: true,
            status: true,
            department: true,
            createdAt: true,
            completedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate performance metrics for each agent
    const performanceMap = new Map<string, AgentPerformanceMetrics>()

    // Initialize metrics for all agents
    for (const agent of agents) {
      performanceMap.set(agent.id, {
        agentId: agent.id,
        agentName: agent.name,
        agentCode: agent.code,
        agentRole: agent.role,
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        successRate: 0,
        averageCompletionTime: 0,
        totalTokensUsed: 0,
        qualityScore: agent.qualityScore || 0.5,
        activeRuns: 0,
        recentActivity: [],
        skillUsage: {},
        departmentPerformance: {},
      })
    }

    // Process runs to calculate metrics
    for (const run of agentRuns) {
      const metrics = performanceMap.get(run.agentId)
      if (!metrics) continue

      metrics.totalTasks++
      metrics.totalTokensUsed += run.tokensUsed || 0

      if (run.status === 'COMPLETED') {
        metrics.completedTasks++
        
        if (run.issue?.completedAt && run.issue?.createdAt) {
          const duration = run.issue.completedAt.getTime() - run.issue.createdAt.getTime()
          metrics.averageCompletionTime = 
            (metrics.averageCompletionTime * (metrics.completedTasks - 1) + duration) / metrics.completedTasks
          
          // Add to recent activity (last 10)
          if (metrics.recentActivity.length < 10) {
            metrics.recentActivity.push({
              taskId: run.issueId,
              status: run.issue.status,
              completedAt: run.issue.completedAt,
              duration,
            })
          }
        }

        // Track department performance
        if (run.issue?.department) {
          if (!metrics.departmentPerformance[run.issue.department]) {
            metrics.departmentPerformance[run.issue.department] = {
              totalTasks: 0,
              successRate: 0,
              averageTime: 0,
            }
          }
          
          const deptPerf = metrics.departmentPerformance[run.issue.department]
          deptPerf.totalTasks++
          
          if (run.issue?.completedAt && run.issue?.createdAt) {
            const duration = run.issue.completedAt.getTime() - run.issue.createdAt.getTime()
            deptPerf.averageTime = 
              (deptPerf.averageTime * (deptPerf.totalTasks - 1) + duration) / deptPerf.totalTasks
          }
          
          deptPerf.successRate = (deptPerf.totalTasks / metrics.completedTasks) * 100
        }
      } else if (run.status === 'FAILED') {
        metrics.failedTasks++
      } else if (run.status === 'RUNNING') {
        metrics.activeRuns++
      }

      // Calculate success rate
      metrics.successRate = metrics.totalTasks > 0 
        ? (metrics.completedTasks / metrics.totalTasks) * 100 
        : 0

      // Track skill usage from metadata
      if (run.metadata) {
        try {
          const metadata = JSON.parse(run.metadata as string)
          if (metadata.skills && Array.isArray(metadata.skills)) {
            for (const skill of metadata.skills) {
              metrics.skillUsage[skill] = (metrics.skillUsage[skill] || 0) + 1
            }
          }
        } catch {
          // Invalid JSON, skip
        }
      }
    }

    // Convert map to array and sort by performance
    const performanceData = Array.from(performanceMap.values()).sort(
      (a, b) => b.successRate - a.successRate
    )

    // Calculate aggregate statistics
    const aggregateStats = {
      totalAgents: agents.length,
      totalTasks: agentRuns.length,
      totalCompleted: agentRuns.filter(r => r.status === 'COMPLETED').length,
      totalFailed: agentRuns.filter(r => r.status === 'FAILED').length,
      totalActive: agentRuns.filter(r => r.status === 'RUNNING').length,
      averageSuccessRate: performanceData.length > 0
        ? performanceData.reduce((sum, m) => sum + m.successRate, 0) / performanceData.length
        : 0,
      averageQualityScore: performanceData.length > 0
        ? performanceData.reduce((sum, m) => sum + m.qualityScore, 0) / performanceData.length
        : 0,
      totalTokensConsumed: Array.from(performanceMap.values()).reduce((sum, m) => sum + m.totalTokensUsed, 0),
    }

    return NextResponse.json({
      timeframe,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      aggregate: aggregateStats,
      agents: performanceData,
    })

  } catch (error: any) {
    console.error('[AgentAnalytics] Error fetching performance data:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch agent analytics' }, { status: 500 })
  }
}