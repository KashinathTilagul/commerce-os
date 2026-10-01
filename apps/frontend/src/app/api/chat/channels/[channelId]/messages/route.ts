export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { checkRateLimit, getClientIP } from '@/lib/security'
import { getOrCreateChannel } from '@/lib/chat'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const ip = getClientIP(req)
  const rateLimit = checkRateLimit(ip, req.nextUrl.pathname)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    )
  }

  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const { channelId } = await params
    const channel = await getOrCreateChannel(auth.organizationId, channelId)
    if (!channel) return NextResponse.json({ messages: [] })

    const { searchParams } = new URL(req.url)
    const threadId = searchParams.get('threadId')

    if (threadId) {
      const parent = await db.message.findFirst({
        where: { id: threadId, channelId: channel.id },
        include: { replies: { orderBy: { createdAt: 'asc' } } },
      })
      if (!parent) return NextResponse.json({ messages: [] })
      return NextResponse.json({ messages: [parent, ...parent.replies] })
    }

    const messages = await db.message.findMany({
      where: { channelId: channel.id, parentMessageId: null },
      orderBy: { createdAt: 'asc' },
      take: 100,
    })
    return NextResponse.json({ messages })
  } catch (e: any) {
    console.error('[Chat Channel Messages] Error:', e)
    const detail = process.env.NODE_ENV === 'development' ? (e?.message || String(e)) : undefined
    return NextResponse.json({ error: 'Failed to fetch messages', ...(detail ? { detail } : {}) }, { status: 500 })
  }
}
