export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { randomBytes } from 'node:crypto'

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || ''
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || ''

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  const state = randomBytes(32).toString('hex')
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || `${new URL(req.url).origin}/api/spotify/callback`
  const scope = 'streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state user-library-read user-read-recently-played playlist-read-private playlist-read-collaborative'
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scope,
    show_dialog: 'true', // force re-consent so newly-added scopes (streaming) are granted
    state,
  })
  
  const response = NextResponse.redirect(`https://accounts.spotify.com/authorize?${params}`)
  response.cookies.set('spotify_oauth_state', `${auth.user.id}:${state}`, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 600, path: '/' })
  return response
}
