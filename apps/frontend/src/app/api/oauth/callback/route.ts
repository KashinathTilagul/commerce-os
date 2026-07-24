import { NextRequest, NextResponse } from 'next/server'
import { storeOAuthToken, getProviderConfig } from '@/lib/oauth'

export async function GET(req: NextRequest) {
  const url = req.nextUrl
  const code = url.searchParams.get('code')
  const stateStr = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL('/settings/integrations?error=oauth_failed', req.url))
  }

  if (!code || !stateStr) {
    return NextResponse.redirect(new URL('/settings/integrations?error=missing_params', req.url))
  }

  let state: { provider: string; userId: string }
  try {
    state = JSON.parse(decodeURIComponent(stateStr))
  } catch (e) {
    return NextResponse.redirect(new URL('/settings/integrations?error=invalid_state', req.url))
  }

  const { provider, userId } = state
  const config = getProviderConfig(provider)
  if (!config) {
    return NextResponse.redirect(new URL('/settings/integrations?error=unsupported_provider', req.url))
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/oauth/callback`

  let tokenUrl = config.tokenUrl as string
  if (provider === 'shopify') {
    const shop = url.searchParams.get('shop')
    if (!shop) {
      return NextResponse.redirect(new URL('/settings/integrations?error=missing_shop', req.url))
    }
    tokenUrl = (config.tokenUrl as string).replace('{shop}', shop)
  }

  try {
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
    const expiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined

    await storeOAuthToken(userId, provider, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      scope: data.scope,
      expiresAt: (expiresAt || undefined) as any,
    })

    return NextResponse.redirect(new URL('/settings/integrations?success=1', req.url))
  } catch (err) {
    console.error('OAuth callback error:', err)
    return NextResponse.redirect(new URL('/settings/integrations?error=exchange_failed', req.url))
  }
}
