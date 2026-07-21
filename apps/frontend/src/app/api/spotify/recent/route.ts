import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || ''
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || ''

async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('spotify_access_token')?.value
  if (accessToken) return accessToken

  const refreshToken = cookieStore.get('spotify_refresh_token')?.value
  if (!refreshToken) return null

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
  if (data.access_token) {
    cookieStore.set('spotify_access_token', data.access_token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: data.expires_in,
      path: '/',
    })
    return data.access_token
  }
  return null
}

export async function GET() {
  const token = await getAccessToken()
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const response = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=20', {
    headers: { 'Authorization': `Bearer ${token}` },
  })

  if (!response.ok) {
    return NextResponse.json({ error: 'Failed to fetch recent tracks' }, { status: response.status })
  }

  const data = await response.json()
  return NextResponse.json(data)
}
