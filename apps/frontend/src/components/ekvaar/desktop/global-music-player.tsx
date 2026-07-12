'use client'

import { useMusicStore } from '@/lib/music-store'
import { useEffect, useRef, useState } from 'react'
import { Music, X, ChevronUp, ChevronDown, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'

declare global {
  interface Window {
    Spotify: any
    onSpotifyWebPlaybackSDKReady: () => void
  }
}

export function GlobalMusicPlayer() {
  const { tracks, currentIdx, playing, volume, minimized, position, isOpen, playTrack, toggleMinimize, move, close, togglePlay, next, prev, setVolume } = useMusicStore()
  const current = tracks[currentIdx]
  const playerRef = useRef<any>(null)
  const [playerReady, setPlayerReady] = useState(false)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/spotify/token')
      .then(res => res.json())
      .then(data => {
        if (data.access_token) {
          setToken(data.access_token)
        }
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (!token || !isOpen) return

    const loadSpotifySDK = () => {
      if (window.Spotify) {
        const player = new window.Spotify.Player({
          name: 'EKVAAR OS Player',
          getOAuthToken: (cb: (token: string) => void) => cb(token!),
          volume: volume / 100
        })

        player.addListener('ready', ({ device_id }: { device_id: string }) => {
          setDeviceId(device_id)
          setPlayerReady(true)
        })

        player.addListener('player_state_changed', (state: any) => {
          if (state) {
            useMusicStore.setState({ playing: !state.paused })
          }
        })

        player.connect()
        playerRef.current = player
      } else {
        setTimeout(loadSpotifySDK, 100)
      }
    }

    if (!document.getElementById('spotify-sdk')) {
      const script = document.createElement('script')
      script.src = 'https://sdk.scdn.co/spotify-player.js'
      script.id = 'spotify-sdk'
      document.body.appendChild(script)
      window.onSpotifyWebPlaybackSDKReady = loadSpotifySDK
    } else {
      loadSpotifySDK()
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect()
      }
    }
  }, [token, isOpen])

  useEffect(() => {
    if (!playerRef.current || !playerReady) return
    playerRef.current.setVolume(volume / 100)
  }, [volume, playerReady])

  useEffect(() => {
    if (!playerRef.current || !playerReady) return
    playing ? playerRef.current.resume() : playerRef.current.pause()
  }, [playing, playerReady])

  useEffect(() => {
    if (!current?.spotifyUri || !deviceId || !token) return
    
    fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ uris: [current.spotifyUri] })
    }).catch(console.error)
  }, [current?.spotifyUri, deviceId, token])

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setDragging(true)
      dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y }
    }
  }

  useEffect(() => {
    if (!dragging) return
    const handleMouseMove = (e: MouseEvent) => {
      move({
        x: Math.max(0, Math.min(window.innerWidth - 300, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 200, e.clientY - dragOffset.current.y))
      })
    }
    const handleMouseUp = () => setDragging(false)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging])

  if (!isOpen) return null

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`fixed bg-popover border border-border shadow-2xl rounded-lg overflow-hidden ${dragging ? 'cursor-grabbing' : ''}`}
      style={{
        left: position.x,
        top: position.y,
        width: minimized ? 300 : 340,
        zIndex: 9999,
      }}
    >
      <div className="drag-handle flex items-center justify-between px-3 py-2 bg-green-950 border-b border-border cursor-grab select-none">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Music className="h-4 w-4 text-green-500 shrink-0" />
          <span className="text-xs font-medium truncate text-green-400">
            {current?.title || 'Spotify Player'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={toggleMinimize} className="p-1 hover:bg-green-900 rounded">
            {minimized ? <ChevronUp className="h-3 w-3 text-green-400" /> : <ChevronDown className="h-3 w-3 text-green-400" />}
          </button>
          <button onClick={close} className="p-1 hover:bg-green-900 rounded">
            <X className="h-3 w-3 text-green-400" />
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="p-3">
          {!token ? (
            <div className="text-center py-8">
              <a
                href="/api/spotify/login"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-full transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.899 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.381z"/>
                </svg>
                Login with Spotify
              </a>
              <p className="text-xs text-muted-foreground mt-2">Connect to play your music</p>
            </div>
          ) : (
            <>
              {current && (
                <div className="flex items-center gap-3 mb-3">
                  {current.thumbnail && (
                    <img src={current.thumbnail} alt="" className="w-12 h-12 rounded object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{current.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{current.artist}</div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-center gap-2 mb-3">
                <button onClick={prev} className="p-2 hover:bg-muted rounded-full">
                  <SkipBack className="h-4 w-4" />
                </button>
                <button
                  onClick={togglePlay}
                  className="p-3 bg-green-600 hover:bg-green-700 rounded-full text-white"
                >
                  {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </button>
                <button onClick={next} className="p-2 hover:bg-muted rounded-full">
                  <SkipForward className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => setVolume(volume === 0 ? 50 : 0)} className="p-1">
                  {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="flex-1 h-1 bg-muted rounded-full appearance-none cursor-pointer"
                />
              </div>

              {tracks.length === 0 && (
                <p className="text-xs text-center text-muted-foreground py-4">
                  Open Spotify app to control playback
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
