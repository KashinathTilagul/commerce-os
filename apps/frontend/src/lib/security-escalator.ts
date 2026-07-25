import { db } from '@/lib/db'

export interface SecurityAlertPayload {
  title: string
  description: string
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
  affectedPath?: string
  poc?: string
  recommendedPatch?: string
  ruleId?: string
}

export async function processSecurityAlert(userId: string, alert: SecurityAlertPayload) {
  const { title, description, severity, affectedPath, poc, recommendedPatch, ruleId } = alert

  // 1. Log to Event Bus
  const event = await db.event.create({
    data: {
      userId,
      type: 'SECURITY_ALERT',
      actorName: 'Security Engine',
      summary: `[${severity}] ${title}`,
      payload: JSON.stringify({
        title,
        description,
        affectedPath,
        poc,
        recommendedPatch,
        ruleId,
        severity,
      }),
      severity: severity === 'CRITICAL' ? 'ERROR' : severity === 'WARNING' ? 'WARN' : 'INFO',
    },
  })

  // 2. Escalate CRITICAL and WARNING to Founder Inbox (Approval table)
  let approval: any = null
  if (severity === 'CRITICAL' || severity === 'WARNING') {
    // Find or fallback to human founder
    const founderAgent = await db.agent.findFirst({ where: { userId, code: 'FOUNDER' } })
    const requesterId = founderAgent?.id || (await db.agent.findFirst({ where: { userId } }))?.id

    if (requesterId) {
      const count = await db.approval.count({ where: { userId } })
      const code = `SEC-${String(count + 1).padStart(2, '0')}`

      approval = await db.approval.create({
        data: {
          userId,
          code,
          type: 'SECURITY',
          title: `[SECURITY] ${title}`,
          description: `${description}\n\nAffected Path: ${affectedPath || 'N/A'}\n\nRecommended Fix:\n${recommendedPatch || 'Review code path immediately.'}`,
          amount: 0,
          status: 'PENDING',
          requesterId,
          inbox: 'MINE',
          isRead: false,
        },
      })
    }
  }

  // 3. Dispatch Discord alert for CRITICAL severity if Discord integration is connected
  if (severity === 'CRITICAL') {
    try {
      const discordIntegration = await db.integration.findFirst({
        where: { organizationId: userId, toolkitSlug: 'discord', isConnected: true },
      })
      if (discordIntegration) {
        const { executeTool } = await import('@/lib/composio-service')
        const alertMsg = `🚨 **EKVAAR OS SECURITY ALERT** 🚨\n**Severity:** ${severity}\n**Title:** ${title}\n**Location:** \`${affectedPath || 'N/A'}\`\n**Action Required:** Check Founder Inbox for details.`
        await executeTool({
          organizationId: userId,
          toolkitSlug: 'discord',
          toolSlug: 'discord_send_message',
          agentCode: 'SECURITY',
          agentName: 'Security Engine',
          input: { content: alertMsg },
        }).catch(() => {})
      }
    } catch (e) {
      console.error('[Security Escalator] Discord dispatch skipped:', e)
    }
  }

  return { event, approval }
}
