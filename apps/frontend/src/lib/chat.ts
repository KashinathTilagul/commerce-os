import { db } from '@/lib/db'
import { sanitizeInput } from '@/lib/security'
import { ChannelType } from '@prisma/client'

const BOT_CODES = ['CEO', 'CFO', 'CMO', 'COO', 'CTO', 'CCO']
const DEPT_NAMES = ['Marketing', 'Operations', 'Technology', 'Creative', 'Finance']

/**
 * Resolves or creates a channel strictly scoped to the specified organization.
 * Accepts either an existing channel cuid ID or a channel name (e.g. 'Company', 'CEO').
 */
export async function getOrCreateChannel(organizationId: string, channelIdentifier: string) {
  const cleanKey = sanitizeInput(channelIdentifier || '', { maxLength: 80 }).trim()
  if (!cleanKey) return null

  // 1. Look up channel by ID or name within the organization's boundary
  let channel = await db.channel.findFirst({
    where: {
      organizationId,
      OR: [
        { id: cleanKey },
        { name: cleanKey },
      ],
    },
  })

  if (channel) return channel

  // 2. Self-seed missing channel for this tenant
  const isBot = BOT_CODES.includes(cleanKey)
  const isDept = DEPT_NAMES.includes(cleanKey)
  const type: ChannelType = isBot ? ChannelType.AGENT : isDept ? ChannelType.DEPARTMENT : ChannelType.COMPANY

  return db.channel.create({
    data: {
      organizationId,
      name: cleanKey,
      type,
    },
  })
}
