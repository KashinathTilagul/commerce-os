import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || ''
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || ''

async function getAccessToken(): Promise<{ token: string | null; error?: string }> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('spotify_access_token')?.value
    
    if (accessToken) {
      return { token: accessToken }
    }

    const refreshToken = cookieStore.get('spotify_refresh_token')?.value
    if (!refreshToken) {
      return { token: null, error: 'No refresh token in cookies' }
    }

    if (!CLIENT_ID || !CLIENT_SECRET) {
      return { token: null, error: 'Spotify credentials not configured' }
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    const data = await response.json()
    
    if (data.error) {
      return { token: null, error: data.error_description || data.error }
    }

    if (data.access_token) {
      cookieStore.set('spotify_access_token', data.access_token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: data.expires_in || 3600,
        path: '/',
      })
      return { token: data.access_token }
    }

    return { token: null, error: 'No access token in response' }
  } catch (e: any) {
    return { token: null, error: e.message }
  }
}

export async function GET() {
  const { token, error } = await getAccessToken()
  
  if (!token) {
    return NextResponse.json({ error: error || 'Not authenticated' }, { status: 401 })
  }

  try {
    const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: { 'Authorization': `Bearer ${token}` },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json({ 
        error: 'Spotify API error', 
        details: errorData.error?.message || response.statusText 
      }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to fetch playlists', details: e.message }, { status: 500 })
  }
}
