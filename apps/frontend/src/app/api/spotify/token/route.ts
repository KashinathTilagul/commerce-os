import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || ''
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || ''

export async function GET() {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('spotify_access_token')?.value
    
    if (accessToken) {
      return NextResponse.json({ token: accessToken })
    }

    const refreshToken = cookieStore.get('spotify_refresh_token')?.value
    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token' }, { status: 401 })
    }

    if (!CLIENT_ID || !CLIENT_SECRET) {
      return NextResponse.json({ error: 'Spotify credentials not configured' }, { status: 500 })
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
      return NextResponse.json({ error: data.error_description || data.error }, { status: 400 })
    }

    if (data.access_token) {
      cookieStore.set('spotify_access_token', data.access_token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: data.expires_in || 3600,
        path: '/',
      })
      return NextResponse.json({ token: data.access_token })
    }

    return NextResponse.json({ error: 'No access token in response' }, { status: 500 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
