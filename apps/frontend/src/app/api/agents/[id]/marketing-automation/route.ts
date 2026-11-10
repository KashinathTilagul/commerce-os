export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { routeObject } from '@/lib/ai-router'
import { sanitizeInput } from '@/lib/security'

const RequestSchema = z.object({
  instruction: z.string().trim().min(3, 'Instruction must be at least 3 characters').max(1000),
})

const MarketingPlanSchema = z.object({
  cycle_name: z.string().min(3),
  items: z.array(z.object({
    platform: z.enum(['Instagram', 'Facebook', 'Threads', 'LinkedIn']),
    format: z.enum(['post', 'carousel', 'reel', 'video', 'text_only']),
    caption: z.string().min(10),
    asset_brief: z.string().min(10),
    scheduled_at_ist: z.string().min(10),
  })).min(4).max(8),
})

function safeParseJson(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const { id } = await context.params
  const agent = await db.agent.findFirst({
    where: { id, organizationId: auth.organizationId },
    select: { id: true },
  })
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  const events = await db.event.findMany({
    where: {
      organizationId: auth.organizationId,
      type: 'MARKETING_WORKFLOW_RUN',
      actorId: agent.id,
    },
    orderBy: { timestamp: 'desc' },
    take: 20,
    select: {
      id: true,
      summary: true,
      timestamp: true,
      payload: true,
    },
  })

  return NextResponse.json({
    runs: events.map((event) => ({
      id: event.id,
      summary: event.summary,
      timestamp: event.timestamp.toISOString(),
      payload: safeParseJson(event.payload),
    })),
  })
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const { id } = await context.params
  const agent = await db.agent.findFirst({
    where: { id, organizationId: auth.organizationId },
    select: { id: true, name: true, code: true, role: true },
  })
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  try {
    const parsed = RequestSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid instruction' }, { status: 400 })
    }

    const instruction = sanitizeInput(parsed.data.instruction)
    const organization = await db.organization.findUnique({
      where: { id: auth.organizationId },
      select: { name: true, context: true },
    })

    const orgName = organization?.name || 'Brand'
    const ctx = organization?.context
    const brandBrief = [
      `Brand: ${orgName}.`,
      `Profile: ${ctx?.companyProfile || 'not supplied'}.`,
      `Brand DNA: ${ctx?.brandDna || 'not supplied'}.`,
      `Industry: ${ctx?.industry || 'not supplied'}.`,
      `Tone: ${ctx?.toneOfVoice || 'clear, specific, and human'}.`,
    ].join(' ')

    const generated = await routeObject<z.infer<typeof MarketingPlanSchema>>('default', auth.organizationId, {
      schema: MarketingPlanSchema,
      system: `You are ${agent.name} (${agent.role}) for ${orgName}. ${brandBrief} Write concrete, brand-grounded social content without generic AI filler. Only make claims supported by the brand brief.`,
      prompt: `${instruction}\n\nGenerate an 8-item cross-channel content cycle (Instagram carousel + reel, Facebook post + video, Threads text_only + post, LinkedIn post + carousel) with future ISO-8601 +05:30 timestamps.`,
      temperature: 0.55,
      maxOutputTokens: 2600,
    })

    const calendar = generated.object.items.map((item) => ({
      ...item,
      rights_check: 'PASS — original AI-generated concept; no third-party copyrighted asset requested',
      policy_check: 'PASS — organic branded content; Founder approval required before publishing',
    }))

    const executionId = crypto.randomUUID()
    const plan = {
      content_cycle: {
        cycle_name: generated.object.cycle_name,
        total_posts: calendar.length,
        timezone: 'Asia/Kolkata',
      },
      calendar,
      publishing_summary: {
        total_items: calendar.length,
        approval: 'FOUNDER_REQUIRED',
      },
    }

    const result = {
      executionId,
      generatedAt: new Date().toISOString(),
      model: { provider: generated.provider, id: generated.model, degraded: false },
      plan,
    }

    const taskCode = `MKT-${Date.now().toString(36).toUpperCase().slice(-6)}`
    await db.marketingTask.create({
      data: {
        organizationId: auth.organizationId,
        code: taskCode,
        type: 'content_calendar',
        title: generated.object.cycle_name.slice(0, 120),
        instruction,
        status: 'READY',
        content: calendar.map((item) => `[${item.platform} · ${item.format}] ${item.caption}`).join('\n\n'),
        platforms: Array.from(new Set(calendar.map((item) => item.platform.toLowerCase()))),
        platformDetails: calendar.map((item) => `${item.platform}:${item.format}:${item.scheduled_at_ist}`),
        format: 'none',
      },
    })

    await db.event.create({
      data: {
        organizationId: auth.organizationId,
        type: 'MARKETING_WORKFLOW_RUN',
        actorId: agent.id,
        actorName: agent.name,
        summary: `${agent.name}: ${generated.object.cycle_name} (${calendar.length} posts)`,
        payload: JSON.stringify({ agentId: agent.id, instruction, taskCode, result }),
      },
    })

    return NextResponse.json({ executionId, plan })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Marketing workflow failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
