import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const { id } = params
  const skill = await db.skill.findUnique({
    where: { id, userId: auth.user.id }
  })

  if (!skill) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(skill)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const { id } = params
  const body = await req.json()
  
  const skill = await db.skill.update({
    where: { id, userId: auth.user.id },
    data: {
      slug: body.slug,
      name: body.name,
      category: body.category,
      source: body.source,
      skillMdPath: body.skillMdPath,
      skillMdContent: body.skillMdContent,
      requiredTools: body.requiredTools,
      requiredPerms: body.requiredPerms,
      dependencies: body.dependencies,
      inputSchema: body.inputSchema,
      outputSchema: body.outputSchema,
      costEstimate: body.costEstimate,
      riskLevel: body.riskLevel,
      version: body.version,
      isActive: body.isActive
    }
  })

  return NextResponse.json(skill)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const { id } = params
  await db.skill.delete({
    where: { id, userId: auth.user.id }
  })

  return NextResponse.json({ success: true })
}
