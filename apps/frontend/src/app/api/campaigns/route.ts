export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrganization } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const campaigns = await db.campaign.findMany({
    where: { organizationId: auth.organizationId },
    orderBy: { startDate: 'desc' },
  })
  const integrations = await db.integration.findMany({
    where: { organizationId: auth.organizationId, toolkitSlug: { in: ['instagram', 'meta_ads', 'mailchimp'] } },
    select: { toolkitSlug: true, isConnected: true },
  })
  const connected = new Set(integrations.filter((i) => i.isConnected).map((i) => i.toolkitSlug))
  return NextResponse.json(campaigns.map((campaign) => ({
    ...campaign,
    integrationConnected: campaign.channel === 'INSTAGRAM'
      ? connected.has('instagram') || connected.has('meta_ads')
      : campaign.channel === 'EMAIL' ? connected.has('mailchimp') : true,
  })))
}

export async function POST(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const body = await req.json()
    const { title, pillar, channel, budget } = body
    if (!title || !pillar || !channel) {
      return NextResponse.json({ error: 'title, pillar, and channel are required' }, { status: 400 })
    }

    const campaign = await db.campaign.create({
      data: {
        organizationId: auth.organizationId,
        title,
        pillar,
        channel,
        budget: Number(budget) || 0,
        status: 'DRAFT',
        startDate: new Date(),
      },
    })

    await db.event.create({
      data: {
        organizationId: auth.organizationId,
        type: 'CAMPAIGN_LAUNCHED',
        actorName: 'Founder',
        summary: `Created campaign: ${title}`,
        payload: JSON.stringify({ campaignId: campaign.id }),
        severity: 'INFO',
      },
    })

    return NextResponse.json(campaign)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
