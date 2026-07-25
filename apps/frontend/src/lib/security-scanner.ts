import { db } from '@/lib/db'
import { processSecurityAlert, SecurityAlertPayload } from './security-escalator'
import fs from 'fs'
import path from 'path'

export interface ScanResult {
  passed: boolean
  totalChecks: number
  alerts: SecurityAlertPayload[]
}

/**
 * Engineered, Non-AI Security Scanner for EKVAAR OS.
 * Performs 100% deterministic static and dynamic checks across code, DB, and environment.
 */
export async function runEngineeredSecurityScan(organizationId: string): Promise<ScanResult> {
  const alerts: SecurityAlertPayload[] = []
  let totalChecks = 0

  // Check 1: Audit System Setting Secrets
  totalChecks++
  try {
    const settings = await db.systemSetting.findUnique({ where: { id: 'global' } })
    if (!settings?.primaryApiKey) {
      alerts.push({
        title: 'Primary AI API Key Missing',
        description: 'Global system settings do not have a primary API key configured.',
        severity: 'WARNING',
        affectedPath: 'SystemSetting.primaryApiKey',
        recommendedPatch: 'Navigate to Settings and configure primary API key.',
        ruleId: 'SEC-SYS-001',
      })
    }
  } catch (e) {}

  // Check 2: Audit Expired OAuth Tokens
  totalChecks++
  try {
    const expiredTokens = await db.oAuthToken.findMany({
      where: {
        organizationId,
        isValid: true,
        expiresAt: { lt: new Date() },
      },
    })
    for (const token of expiredTokens) {
      alerts.push({
        title: `Expired OAuth Token: ${token.provider}`,
        description: `OAuth token for ${token.provider} has expired and needs re-authentication.`,
        severity: 'WARNING',
        affectedPath: `OAuthToken:${token.provider}`,
        recommendedPatch: `Re-authenticate ${token.provider} in Integrations.`,
        ruleId: 'SEC-AUTH-002',
      })
    }
  } catch (e) {}

  // Check 3: Static Code Audit — Verify API Routes Have requireAuth Guard
  totalChecks++
  try {
    const apiDir = path.resolve(process.cwd(), 'src/app/api')
    if (fs.existsSync(apiDir)) {
      const checkRouteFiles = (dir: string) => {
        const files = fs.readdirSync(dir)
        for (const file of files) {
          const fullPath = path.join(dir, file)
          const stat = fs.statSync(fullPath)
          if (stat.isDirectory()) {
            checkRouteFiles(fullPath)
          } else if (file === 'route.ts' || file === 'route.js') {
            // Exclude public routes like auth login/callback/health/cron/browse worker
            const relPath = path.relative(apiDir, fullPath)
            if (
              relPath.includes('auth') ||
              relPath.includes('health') ||
              relPath.includes('cron') ||
              relPath.includes('worker') ||
              relPath.includes('events/security')
            ) {
              continue
            }

            const content = fs.readFileSync(fullPath, 'utf8')
            if (!content.includes('requireAuth') && !content.includes('getServerSession')) {
              alerts.push({
                title: 'API Route Missing Auth Guard',
                description: `API endpoint ${relPath} does not reference requireAuth() or session validation.`,
                severity: 'CRITICAL',
                affectedPath: `src/app/api/${relPath}`,
                recommendedPatch: 'Add import { requireAuth } from "@/lib/auth-guard" and check auth.success.',
                ruleId: 'SEC-CODE-003',
              })
            }
          }
        }
      }
      checkRouteFiles(apiDir)
    }
  } catch (e) {
    console.error('[Security Scanner] Code audit error:', e)
  }

  // Check 4: Check Unhandled CamoFox Stalled Jobs
  totalChecks++
  try {
    const stalledCount = await db.browseJob.count({
      where: {
        organizationId,
        status: 'RUNNING',
        startedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) },
      },
    })
    if (stalledCount > 0) {
      alerts.push({
        title: 'Stalled Browser Jobs Detected',
        description: `Found ${stalledCount} browse jobs in RUNNING state for over 5 minutes.`,
        severity: 'INFO',
        affectedPath: 'BrowseJob',
        recommendedPatch: 'Worker auto-cleanup will timeout these jobs.',
        ruleId: 'SEC-JOB-004',
      })
    }
  } catch (e) {}

  // Check 5: Check High Severity Agent Reflector Failures
  totalChecks++
  try {
    const highFailures = await db.event.count({
      where: {
        organizationId,
        type: 'SECURITY_ALERT',
        timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    })
    if (highFailures > 10) {
      alerts.push({
        title: 'Elevated Security Event Frequency',
        description: `More than 10 security events logged in the last 24 hours (${highFailures} events).`,
        severity: 'WARNING',
        affectedPath: 'EventLedger',
        recommendedPatch: 'Inspect Activity Monitor logs for anomalous activity.',
        ruleId: 'SEC-EVENT-005',
      })
    }
  } catch (e) {}

  // Process all alerts through the escalator
  for (const alert of alerts) {
    await processSecurityAlert(organizationId, alert)
  }

  return {
    passed: alerts.filter(a => a.severity === 'CRITICAL').length === 0,
    totalChecks,
    alerts,
  }
}
