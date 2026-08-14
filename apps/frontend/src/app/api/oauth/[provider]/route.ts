export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { revokeOAuthToken, getProviderConfig, createOAuthState, finalizeOAuthConnection } from '@/lib/oauth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const { provider } = await params
  const config = getProviderConfig(provider)
  if (!config) return NextResponse.json({ error: 'Unsupported OAuth provider' }, { status: 400 })
  const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`] || ''
  const clientSecret = process.env[`${provider.toUpperCase()}_CLIENT_SECRET`] || ''
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: `${provider} OAuth is not configured for this deployment. Add its client ID and secret before connecting.` }, { status: 503 })
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/oauth/callback`
  const state = createOAuthState(provider, auth.organizationId)

  let authUrl: string = config.authUrl
  if (provider === 'shopify') {
    const shop = req.nextUrl.searchParams.get('shop')
    if (!shop) return NextResponse.json({ error: 'Missing shop parameter for Shopify' }, { status: 400 })
    authUrl = config.authUrl.replace('{shop}', shop)
  }

  const url = new URL(authUrl)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', config.scopes.join(' '))
  url.searchParams.set('state', state)

  return NextResponse.redirect(url)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const { provider } = await params
  const config = getProviderConfig(provider)
  if (!config) return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 })

  try {
    const { code, shop } = await req.json()
    if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 })

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/oauth/callback`
    
    let tokenUrl: string = config.tokenUrl
    if (provider === 'shopify') {
      if (!shop) return NextResponse.json({ error: 'Missing shop for Shopify' }, { status: 400 })
      tokenUrl = config.tokenUrl.replace('{shop}', shop)
    }

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env[`${provider.toUpperCase()}_CLIENT_ID`] || '',
        client_secret: process.env[`${provider.toUpperCase()}_CLIENT_SECRET`] || '',
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to exchange code')
    }

    const data = await response.json()
    await finalizeOAuthConnection(auth.organizationId, provider, data, shop)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const { provider } = await params
  await revokeOAuthToken(auth.organizationId, provider)
  return NextResponse.json({ success: true, message: `Disconnected ${provider}` })
}
