import { NextRequest, NextResponse } from 'next/server'

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || ''
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || ''
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'https://os.ekvaar.com/api/spotify/callback'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  
  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 })
  }

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
        redirect_uri: REDIRECT_URI,
      }),
    })

    const data = await response.json()
    
    if (data.error) {
      return NextResponse.redirect(new URL('/?spotify_error=1', req.url))
    }

    const redirectUrl = new URL('/', req.url)
    redirectUrl.searchParams.set('spotify_access_token', data.access_token)
    redirectUrl.searchParams.set('spotify_refresh_token', data.refresh_token)
    redirectUrl.searchParams.set('spotify_expires', data.expires_in)
    
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('Spotify callback error:', error)
    return NextResponse.redirect(new URL('/?spotify_error=1', req.url))
  }
}
