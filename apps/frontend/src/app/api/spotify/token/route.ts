import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || ''
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || ''

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get('spotify_refresh_token')?.value || req.nextUrl.searchParams.get('refresh_token')
  
  if (!refreshToken) {
    const accessToken = req.nextUrl.searchParams.get('access_token')
    if (accessToken) {
      return NextResponse.json({ access_token: accessToken })
    }
    return NextResponse.json({ error: 'No token available' }, { status: 401 })
  }

  try {
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
      return NextResponse.json({ error: data.error }, { status: 400 })
    }

    return NextResponse.json({ access_token: data.access_token })
  } catch (error) {
    console.error('Token refresh error:', error)
    return NextResponse.json({ error: 'Failed to refresh token' }, { status: 500 })
  }
}
