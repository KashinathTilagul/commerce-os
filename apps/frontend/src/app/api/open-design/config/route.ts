import { NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response
  const publicUrl = process.env.OPEN_DESIGN_PUBLIC_URL || ''
  const proxied = Boolean(process.env.OPEN_DESIGN_URL && process.env.OPEN_DESIGN_API_TOKEN)
  return NextResponse.json({ url: publicUrl || (proxied ? '/api/open-design/proxy' : ''), configured: Boolean(publicUrl || proxied), mode: publicUrl ? 'public' : proxied ? 'authenticated-proxy' : 'unconfigured' })
}
