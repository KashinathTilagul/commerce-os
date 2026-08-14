export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrganization } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const skills = await db.skill.findMany({
    where: { organizationId: auth.organizationId }
  })
  return NextResponse.json(skills)
}

export async function POST(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const body = await req.json()
  const skill = await db.skill.create({
    data: {
      slug: body.slug,
      name: body.name,
      category: body.category || 'general',
      organizationId: auth.organizationId,
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
