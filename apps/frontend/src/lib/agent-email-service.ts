import { db } from './db'
import { executeTool } from './composio-service'

export interface EmailPayload {
  to: string | string[]
  subject: string
  body: string
  html?: string
}

export interface EmailDispatchResult {
  sent: boolean
  provider: 'composio_gmail' | 'simulated' | 'error'
  recipient: string
  subject: string
  error?: string
}

/**
 * Send an email output from an agent or automated playbook.
 * If the organization has a connected Gmail integration via Composio,
 * it routes through the live Gmail API. Otherwise, it logs a clean simulated dispatch.
 */
export async function sendAgentEmail(
  organizationId: string,
  payload: EmailPayload
): Promise<EmailDispatchResult> {
  const recipient = Array.isArray(payload.to) ? payload.to.join(', ') : payload.to
  const subject = payload.subject
  const body = payload.html || payload.body

  try {
    // Check if Gmail integration is connected for this organization
    const gmailIntegration = await db.integration.findFirst({
      where: {
        organizationId,
        toolkitSlug: 'gmail',
        isConnected: true,
      },
    })

    if (gmailIntegration) {
      const result = await executeTool({
        organizationId,
        toolkitSlug: 'gmail',
        toolSlug: 'gmail_send_email',
        agentCode: 'CEO',
        agentName: 'Krishna',
        input: { recipient_email: Array.isArray(payload.to) ? payload.to[0] : payload.to, subject, body },
      })

      if (result.success) {
        return {
          sent: true,
          provider: 'composio_gmail',
          recipient,
          subject,
        }
      }
    }

    // Never claim delivery without a provider receipt.
    return {
      sent: false,
      provider: 'error',
      recipient,
      subject,
      error: 'Gmail is not connected',
    }
  } catch (err: any) {
    return {
      sent: false,
      provider: 'error',
      recipient,
      subject,
      error: err?.message || String(err),
    }
  }
}
