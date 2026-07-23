import { NextResponse } from 'next/server'

// Proxy the Spotify Web Playback SDK through our domain so ad/privacy
// blockers that blacklist sdk.scdn.co don't prevent it from loading.
export async function GET() {
  try {
    const res = await fetch('https://sdk.scdn.co/spotify-player.js', {
      // Cache on the server for an hour; the SDK script rarely changes
      next: { revalidate: 3600 },
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch SDK' }, { status: 502 })
    }
    const js = await res.text()
    return new NextResponse(js, {
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 })
  }
}
