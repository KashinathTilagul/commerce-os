import { NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { listOAuthConnections } from '@/lib/oauth'

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response
  const providers = ['meta', 'threads', 'linkedin']
  const configuration = Object.fromEntries(providers.map((provider) => [provider, Boolean(
    process.env[`${provider.toUpperCase()}_CLIENT_ID`] && process.env[`${provider.toUpperCase()}_CLIENT_SECRET`]
  )]))
  return NextResponse.json({ connections: await listOAuthConnections(auth.organizationId), configuration })
}
