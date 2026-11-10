export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireOrgAdmin, requireOrganization } from '@/lib/auth-guard'
import { getOmniRouteConfig, saveOmniRouteConfig } from '@/lib/omniroute-config'

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const settings = await getOmniRouteConfig(auth.organizationId)
    return NextResponse.json({
      baseUrl: settings.baseUrl,
      hasApiKey: settings.hasApiKey,
      imageModel: settings.imageModel,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireOrgAdmin()
  if (!auth.success) return auth.response

  try {
    const body = await req.json()
    const { baseUrl, apiKey, imageModel } = body

    await saveOmniRouteConfig(auth.organizationId, { baseUrl, apiKey, imageModel })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    const status = error.message === 'No fields to update' || error instanceof TypeError ? 400 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
}
