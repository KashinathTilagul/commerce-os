import { NextRequest, NextResponse } from 'next/server'

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || ''
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || ''

export async function GET(req: NextRequest) {
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || `${new URL(req.url).origin}/api/spotify/callback`
  const scope = 'streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state'
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scope,
  })
  
  return NextResponse.redirect(`https://accounts.spotify.com/authorize?${params}`)
}
