import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || ''
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || ''

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  
  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 })
  }

  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || `${new URL(req.url).origin}/api/spotify/callback`

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    })

    const data = await response.json()
    
    if (data.error) {
      const errorBaseUrl = process.env.NEXTAUTH_URL || new URL(req.url).origin
      return NextResponse.redirect(new URL('/?spotify_error=1', errorBaseUrl))
    }

    const cookieStore = await cookies()

    cookieStore.set('spotify_refresh_token', data.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    })

    cookieStore.set('spotify_access_token', data.access_token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: data.expires_in,
      path: '/',
    })

    const baseUrl = process.env.NEXTAUTH_URL || new URL(req.url).origin
    return NextResponse.redirect(new URL('/?spotify_connected=1', baseUrl))
  } catch (error) {
    console.error('Spotify callback error:', error)
    const errorBaseUrl = process.env.NEXTAUTH_URL || new URL(req.url).origin
    return NextResponse.redirect(new URL('/?spotify_error=1', errorBaseUrl))
  }
}
