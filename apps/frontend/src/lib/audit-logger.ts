import { db } from '@/lib/db'

export enum AuditAction {
  // Approval Actions
  APPROVAL_REQUESTED = 'APPROVAL_REQUESTED',
  APPROVAL_GRANTED = 'APPROVAL_GRANTED',
  APPROVAL_DENIED = 'APPROVAL_DENIED',
  APPROVAL_CANCELLED = 'APPROVAL_CANCELLED',
  
  // Agent Actions
  AGENT_CREATED = 'AGENT_CREATED',
  AGENT_UPDATED = 'AGENT_UPDATED',
  AGENT_DELETED = 'AGENT_DELETED',
  AGENT_DEACTIVATED = 'AGENT_DEACTIVATED',
  AGENT_PROMOTED = 'AGENT_PROMOTED',
  
  // Campaign Actions
  CAMPAIGN_LAUNCHED = 'CAMPAIGN_LAUNCHED',
  CAMPAIGN_STOPPED = 'CAMPAIGN_STOPPED',
  CAMPAIGN_APPROVED = 'CAMPAIGN_APPROVED',
  CAMPAIGN_REJECTED = 'CAMPAIGN_REJECTED',
  
  // Issue Actions
  ISSUE_CREATED = 'ISSUE_CREATED',
  ISSUE_ASSIGNED = 'ISSUE_ASSIGNED',
  ISSUE_ESCALATED = 'ISSUE_ESCALATED',
  ISSUE_RESOLVED = 'ISSUE_RESOLVED',
  
  // Financial Actions
  BUDGET_UPDATED = 'BUDGET_UPDATED',
  BUDGET_EXCEEDED = 'BUDGET_EXCEEDED',
  SPENDING_LIMIT_CHANGED = 'SPENDING_LIMIT_CHANGED',
  
  // Security Actions
  LOGIN_ATTEMPT = 'LOGIN_ATTEMPT',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PERMISSION_GRANTED = 'PERMISSION_GRANTED',
  PERMISSION_REVOKED = 'PERMISSION_REVOKED',
  
  // System Actions
  CONFIGURATION_CHANGED = 'CONFIGURATION_CHANGED',
  INTEGRATION_CONNECTED = 'INTEGRATION_CONNECTED',
  INTEGRATION_DISCONNECTED = 'INTEGRATION_DISCONNECTED',
  DATA_EXPORTED = 'DATA_EXPORTED',
  DATA_IMPORTED = 'DATA_IMPORTED',
}

export enum AuditSeverity {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

interface AuditLogEntry {
  organizationId: string
  action: AuditAction
  actorId?: string
  actorName: string
  actorRole?: string
  targetType: string
  targetId: string
  targetName?: string
  details: Record<string, any>
  severity?: AuditSeverity
  ipAddress?: string
  userAgent?: string
}

export async function logAuditEvent(entry: AuditLogEntry) {
  try {
    // Log to Event table (existing)
    await db.event.create({
      data: {
        organizationId: entry.organizationId,
        type: entry.action,
        actorId: entry.actorId,
        actorName: entry.actorName,
        summary: `${entry.action} on ${entry.targetType}${entry.targetName ? ` (${entry.targetName})` : ''}`,
        payload: JSON.stringify({
          targetType: entry.targetType,
          targetId: entry.targetId,
          targetName: entry.targetName,
          details: entry.details,
          severity: entry.severity || AuditSeverity.INFO,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          actorRole: entry.actorRole,
        }),
        severity: entry.severity || AuditSeverity.INFO,
      },
    })

    // Log critical events to console for immediate visibility
    if (entry.severity === AuditSeverity.CRITICAL) {
      console.error(`[AUDIT CRITICAL] ${entry.action} by ${entry.actorName}`, entry)
    }
  } catch (error) {
    console.error('[AuditLogger] Failed to log audit event:', error)
    // Don't throw - audit logging failure shouldn't break the main operation
  }
}

export async function logGovernanceAction(params: {
  organizationId: string
  action: AuditAction
  actorId?: string
  actorName: string
  actorRole?: string
  approvalId?: string
  campaignId?: string
  issueId?: string
  details: Record<string, any>
  request?: Request
}) {
  const ipAddress = params.request?.headers.get('x-forwarded-for') || 
                   params.request?.headers.get('x-real-ip') || 
                   'unknown'
  const userAgent = params.request?.headers.get('user-agent') || 'unknown'

  let targetType = 'UNKNOWN'
  let targetId = 'unknown'
  let targetName: string | undefined

  if (params.approvalId) {
    targetType = 'APPROVAL'
    targetId = params.approvalId
  } else if (params.campaignId) {
    targetType = 'CAMPAIGN'
    targetId = params.campaignId
  } else if (params.issueId) {
    targetType = 'ISSUE'
    targetId = params.issueId
  }

  // Try to get target name from details
  targetName = params.details.targetName || params.details.title || params.details.name

  return logAuditEvent({
    organizationId: params.organizationId,
    action: params.action,
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    targetType,
    targetId,
    targetName,
    details: params.details,
    severity: getSeverityForAction(params.action),
    ipAddress,
    userAgent,
  })
}

function getSeverityForAction(action: AuditAction): AuditSeverity {
  const criticalActions = [
    AuditAction.APPROVAL_DENIED,
    AuditAction.AGENT_DELETED,
    AuditAction.AGENT_DEACTIVATED,
    AuditAction.BUDGET_EXCEEDED,
    AuditAction.PERMISSION_REVOKED,
    AuditAction.LOGIN_FAILED,
  ]

  const warningActions = [
    AuditAction.APPROVAL_CANCELLED,
    AuditAction.CAMPAIGN_REJECTED,
    AuditAction.ISSUE_ESCALATED,
    AuditAction.BUDGET_UPDATED,
  ]

  if (criticalActions.includes(action)) return AuditSeverity.CRITICAL
  if (warningActions.includes(action)) return AuditSeverity.WARN
  return AuditSeverity.INFO
}

export async function getAuditLogs(params: {
  organizationId: string
  action?: AuditAction
  targetType?: string
  targetId?: string
  actorId?: string
  severity?: AuditSeverity
  limit?: number
  offset?: number
}) {
  const where: any = { organizationId: params.organizationId }
  
  if (params.action) where.type = params.action
  if (params.actorId) where.actorId = params.actorId
  if (params.severity) where.severity = params.severity
  
  // For target filtering, we need to parse the payload JSON
  if (params.targetType || params.targetId) {
    // This is a simplified approach - in production, you might want a more robust JSON query
    // or add separate columns for targetType/targetId to the Event model
  }

  const logs = await db.event.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: params.limit || 100,
    skip: params.offset || 0,
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          code: true,
          role: true,
        },
      },
    },
  })

  return logs
}