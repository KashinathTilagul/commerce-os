import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || ''
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || ''

export async function requireSpotifyAccessToken(): Promise<
  | { success: true; token: string; userId: string }
  | { success: false; response: NextResponse }
> {
  const auth = await requireAuth()
  if (!auth.success) return auth

  const cookieStore = await cookies()
  if (cookieStore.get('spotify_owner')?.value !== auth.user.id) {
    return {
      success: false,
      response: NextResponse.json({ error: 'Reconnect Spotify for this account' }, { status: 401 }),
    }
  }

  const accessToken = cookieStore.get('spotify_access_token')?.value
  if (accessToken) {
    return { success: true, token: accessToken, userId: auth.user.id }
  }

  const refreshToken = cookieStore.get('spotify_refresh_token')?.value
  if (!refreshToken) {
    return {
      success: false,
      response: NextResponse.json({ error: 'No refresh token in cookies' }, { status: 401 }),
    }
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return {
      success: false,
      response: NextResponse.json({ error: 'Spotify credentials not configured' }, { status: 500 }),
    }
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    const data = await response.json()
    if (data.error || !data.access_token) {
      return {
        success: false,
        response: NextResponse.json({ error: data.error_description || data.error || 'Spotify token refresh failed' }, { status: 401 }),
      }
    }

    cookieStore.set('spotify_access_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: data.expires_in || 3600,
      path: '/',
    })
    return { success: true, token: data.access_token, userId: auth.user.id }
  } catch (e: any) {
    return {
      success: false,
      response: NextResponse.json({ error: e.message || 'Spotify authentication failed' }, { status: 500 }),
    }
  }
}
