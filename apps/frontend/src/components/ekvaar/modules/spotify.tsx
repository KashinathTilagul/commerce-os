'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Home, ListMusic, User, Play, Pause, SkipBack, SkipForward, Loader2, LogOut, Smartphone, Laptop, Speaker, Monitor, RefreshCw } from 'lucide-react'
import { PageHeader } from '../shared'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ekvaar/desktop/toast'

declare global {
  interface Window {
    Spotify: any
    onSpotifyWebPlaybackSDKReady: () => void
  }
}

interface SpotifyTrack {
  id: string
  name: string
  artists: { name: string }[]
  album: {
    name: string
    images: { url: string }[]
  }
  uri: string
  duration_ms: number
}

interface SpotifyDevice {
  id: string
  name: string
  type: string
  is_active: boolean
  volume_percent: number
}

function getDeviceIcon(type: string) {
  switch (type?.toLowerCase()) {
    case 'smartphone':
      return <Smartphone className="h-4 w-4" />
    case 'computer':
      return <Laptop className="h-4 w-4" />
    case 'speaker':
      return <Speaker className="h-4 w-4" />
    default:
      return <Monitor className="h-4 w-4" />
  }
}

export function SpotifyApp() {
  const [token, setToken] = useState<string | null>(null)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [sdkDeviceId, setSdkDeviceId] = useState<string | null>(null)
  const [sdkReady, setSdkReady] = useState(false)
  const [view, setView] = useState<'home' | 'search' | 'playlists' | 'playlist'>('home')
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [user, setUser] = useState<{ displayName: string; imageUrl?: string } | null>(null)
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const playerRef = useRef<any>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    const accessToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('spotify_access_token='))
      ?.split('=')[1]
    
    if (accessToken) {
      setToken(accessToken)
    } else {
      fetch('/api/spotify/token')
        .then(r => r.json())
        .then(data => {
          if (data.token) {
            setToken(data.token)
          } else if (data.error) {
            console.log('Spotify token error:', data.error)
          }
        })
        .catch(e => console.error('Token fetch error:', e))
    }
  }, [])

  // Web Playback SDK — registers "EKVAAR OS" as a Spotify device in the browser
  useEffect(() => {
    if (!token) return
    if (playerRef.current) return // already initialized

    const initPlayer = () => {
      const player = new window.Spotify.Player({
        name: 'EKVAAR OS',
        getOAuthToken: (cb: (t: string) => void) => {
          fetch('/api/spotify/token')
            .then(r => r.json())
            .then(d => { if (d.token) cb(d.token) })
            .catch(() => cb(token))
        },
        volume: 0.8,
      })

      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        setSdkDeviceId(device_id)
        setSelectedDeviceId(device_id)
        setSdkReady(true)
        // Transfer playback to EKVAAR OS so the browser becomes the active device
        fetch('/api/spotify/play', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId: device_id }),
        }).catch(() => {})
        queryClient.invalidateQueries({ queryKey: ['spotify-devices'] })
      })

      player.addListener('not_ready', () => {
        setSdkReady(false)
      })

      player.addListener('initialization_error', ({ message }: { message: string }) => {
        toast.error('Spotify SDK error', message)
      })

      player.addListener('authentication_error', ({ message }: { message: string }) => {
        toast.error('Spotify auth error', message)
      })

      player.addListener('account_error', ({ message }: { message: string }) => {
        toast.error('Spotify Premium required', message)
      })

      player.addListener('player_state_changed', (state: any) => {
        if (!state) return
        setIsPlaying(!state.paused)
        const t = state.track_window?.current_track
        if (t) {
          setCurrentTrack({
            id: t.id,
            name: t.name,
            artists: t.artists,
            album: { name: t.album.name, images: t.album.images },
            uri: t.uri,
            duration_ms: t.duration_ms,
          })
        }
      })

      player.connect()
      playerRef.current = player
    }

    if (window.Spotify) {
      initPlayer()
    } else {
      window.onSpotifyWebPlaybackSDKReady = initPlayer
      const script = document.createElement('script')
      script.src = 'https://sdk.scdn.co/spotify-player.js'
      script.async = true
      document.body.appendChild(script)
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect()
        playerRef.current = null
        setSdkReady(false)
        setSdkDeviceId(null)
      }
    }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token) return

    fetch('/api/spotify/me')
      .then(r => r.json())
      .then(data => {
        if (data.display_name) {
          setUser({
            displayName: data.display_name,
            imageUrl: data.images?.[0]?.url,
          })
        }
      })
      .catch(() => {})
  }, [token])

  // Poll currently-playing only when SDK isn't active (external device)
  useEffect(() => {
    if (!token || sdkReady) return

    const pollPlayback = () => {
      fetch('/api/spotify/token')
        .then(r => r.json())
        .then(data => {
          if (!data.token) return null
          return fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: { 'Authorization': `Bearer ${data.token}` },
          })
        })
        .then(r => {
          if (!r || r.status === 204) return null
          return r.json()
        })
        .then(data => {
          if (data?.is_playing !== undefined) {
            setIsPlaying(data.is_playing)
            if (data.item) {
              setCurrentTrack({
                id: data.item.id,
                name: data.item.name,
                artists: data.item.artists,
                album: data.item.album,
                uri: data.item.uri,
                duration_ms: data.item.duration_ms,
              })
            }
          } else {
            setIsPlaying(false)
          }
        })
        .catch(() => {})
    }

    pollPlayback()
    const interval = setInterval(pollPlayback, 5000)
    return () => clearInterval(interval)
  }, [token, sdkReady])

  const { data: devices, isLoading: devicesLoading, refetch: refetchDevices } = useQuery<{ devices: SpotifyDevice[] }>({
    queryKey: ['spotify-devices'],
    queryFn: async () => {
      const r = await fetch('/api/spotify/devices')
      const data = await r.json()
      if (!r.ok) throw new Error(data.details || data.error || 'Failed to fetch devices')
      return data
    },
    enabled: !!token,
    refetchInterval: 30000,
  })

  // Auto-select first available device when none is selected and SDK hasn't claimed one
  useEffect(() => {
    if (selectedDeviceId || sdkDeviceId) return
    const first = devices?.devices?.[0]?.id
    if (first) setSelectedDeviceId(first)
  }, [devices, selectedDeviceId, sdkDeviceId])

  const { data: playlists, isLoading: playlistsLoading, error: playlistsError } = useQuery({
    queryKey: ['spotify-playlists'],
    queryFn: async () => {
      const r = await fetch('/api/spotify/playlists')
      const data = await r.json()
      if (!r.ok) throw new Error(data.details || data.error || 'Failed to load playlists')
      return data
    },
    enabled: !!token,
    retry: false,
  })

  const { data: recentTracks, isLoading: recentLoading, error: recentError } = useQuery({
    queryKey: ['spotify-recent'],
    queryFn: async () => {
      const r = await fetch('/api/spotify/recent')
      const data = await r.json()
      if (!r.ok) throw new Error(data.details || data.error || 'Failed to load recent tracks')
      return data
    },
    enabled: !!token && view === 'home',
    retry: false,
  })

  const { data: searchResults, isLoading: searchLoading, error: searchError } = useQuery({
    queryKey: ['spotify-search', searchQuery],
    queryFn: async () => {
      const r = await fetch(`/api/spotify/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await r.json()
      if (!r.ok) throw new Error(data.details || data.error || 'Search failed')
      return data
    },
    enabled: !!token && searchQuery.length > 2,
    retry: false,
  })

  const { data: playlistDetail, isLoading: playlistLoading } = useQuery({
    queryKey: ['spotify-playlist', selectedPlaylistId],
    queryFn: async () => {
      const r = await fetch(`/api/spotify/playlist/${selectedPlaylistId}`)
      if (!r.ok) throw new Error('Failed')
      return r.json()
    },
    enabled: !!token && !!selectedPlaylistId,
  })

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch('/api/spotify/logout', { method: 'POST' })
    },
    onSuccess: () => {
      setToken(null)
      setUser(null)
      setSelectedDeviceId(null)
      toast.success('Logged out', 'Spotify disconnected')
    },
  })

  const playMutation = useMutation({
    mutationFn: async ({ trackUri, playlistUri }: { trackUri?: string; playlistUri?: string }) => {
      const deviceId = selectedDeviceId || devices?.devices?.find(d => d.is_active)?.id || devices?.devices?.[0]?.id
      if (!deviceId) throw new Error('No device found. Open Spotify on any device first.')
      
      const r = await fetch('/api/spotify/play', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, trackUri, playlistUri }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.details || data.error || 'Playback failed')
      return data
    },
    onSuccess: () => {
      toast.success('Playing', 'Started playback on device')
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['spotify-devices'] }), 1000)
    },
    onError: (e: Error) => {
      toast.error('Playback failed', e.message)
    },
  })

  const togglePlayMutation = useMutation({
    mutationFn: async () => {
      const deviceId = selectedDeviceId || devices?.devices?.find(d => d.is_active)?.id || devices?.devices?.[0]?.id
      if (!deviceId) throw new Error('No device found. Open Spotify on any device first.')
      const t = token || await fetch('/api/spotify/token').then(r => r.json()).then(d => d.token)

      const endpoint = isPlaying ? 'pause' : 'play'
      const response = await fetch(`https://api.spotify.com/v1/me/player/${endpoint}?device_id=${deviceId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' },
      })

      if (response.status === 204) return { success: true }
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error?.message || 'Playback failed')
      }
      return { success: true }
    },
    onSuccess: () => {
      setIsPlaying(!isPlaying)
    },
    onError: (e: Error) => {
      toast.error('Failed', e.message)
    },
  })

  const skipMutation = useMutation({
    mutationFn: async (direction: 'next' | 'previous') => {
      const deviceId = selectedDeviceId || devices?.devices?.find(d => d.is_active)?.id || devices?.devices?.[0]?.id
      if (!deviceId) throw new Error('No device found. Open Spotify on any device first.')
      const t = token || await fetch('/api/spotify/token').then(r => r.json()).then(d => d.token)

      const response = await fetch(`https://api.spotify.com/v1/me/player/${direction}?device_id=${deviceId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${t}` },
      })

      if (response.status === 204) return { success: true }
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error?.message || 'Failed')
      }
      return { success: true }
    },
    onError: (e: Error) => {
      toast.error('Failed', e.message)
    },
  })

  const playTrack = (trackUri: string) => {
    playMutation.mutate({ trackUri })
  }

  const playPlaylist = (playlistUri: string) => {
    playMutation.mutate({ playlistUri })
  }

  const activeDevice = devices?.devices?.find(d => d.is_active)
  const selectedDevice = selectedDeviceId 
    ? devices?.devices?.find(d => d.id === selectedDeviceId)
    : activeDevice

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background">
        <svg className="h-16 w-16 text-arav mb-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.899 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.381z"/>
        </svg>
        <h1 className="text-3xl font-bold text-foreground mb-2">Spotify</h1>
        <p className="text-muted-foreground mb-6">Remote control your Spotify playback</p>
        <a
          href="/api/spotify/login"
          className="inline-flex items-center gap-2 px-8 py-3 bg-arav hover:bg-arav/90 text-arav-foreground rounded-full font-semibold transition-colors"
        >
          Connect with Spotify
        </a>
        <p className="text-xs text-muted-foreground mt-4">Works with free accounts</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        eyebrow="Spotify"
        title="Music"
        description="Remote control your Spotify playback on any device"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
              <span className="ml-1.5">Disconnect</span>
            </Button>
          </div>
        }
      />

      <div className="flex flex-1 min-h-0 border-t border-border">
        {/* Sidebar */}
        <div className="w-52 border-r border-border flex flex-col bg-muted/30">
          {/* Device Selector */}
          <div className="p-3 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Device</span>
              <button
                onClick={() => refetchDevices()}
                className="p-1 hover:bg-muted rounded"
                disabled={devicesLoading}
              >
                <RefreshCw className={`h-3 w-3 text-muted-foreground ${devicesLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {sdkReady && (
              <div className="flex items-center gap-1.5 mb-2 text-xs text-arav font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-arav animate-pulse" />
                EKVAAR OS (this browser)
              </div>
            )}
            {!sdkReady && devices?.devices?.length === 0 && (
              <div className="text-xs text-muted-foreground bg-muted rounded px-2 py-2 leading-relaxed">
                Initializing browser player… or open Spotify on another device.
              </div>
            )}
            {devices?.devices && devices.devices.length > 0 && (
              <select
                value={selectedDeviceId || activeDevice?.id || ''}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="w-full text-sm bg-background border border-border rounded px-2 py-1.5"
              >
                {devices.devices.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name}{d.id === sdkDeviceId ? ' ★' : ''}{d.is_active ? ' (Active)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <nav className="flex-1 p-2">
            <button
              onClick={() => { setView('home'); setSelectedPlaylistId(null) }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm ${view === 'home' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
            >
              <Home className="h-4 w-4" /> Home
            </button>
            <button
              onClick={() => { setView('search'); setSelectedPlaylistId(null) }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm ${view === 'search' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
            >
              <Search className="h-4 w-4" /> Search
            </button>
            <button
              onClick={() => { setView('playlists'); setSelectedPlaylistId(null) }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm ${view === 'playlists' || view === 'playlist' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
            >
              <ListMusic className="h-4 w-4" /> Your Library
            </button>
          </nav>

          {/* User */}
          {user && (
            <div className="p-3 border-t border-border">
              <div className="flex items-center gap-2">
                {user.imageUrl ? (
                  <img src={user.imageUrl} alt="" className="h-8 w-8 rounded-full" />
                ) : (
                  <User className="h-8 w-8 rounded-full bg-muted p-1 text-muted-foreground" />
                )}
                <span className="text-sm text-foreground truncate">{user.displayName}</span>
              </div>
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col bg-background overflow-hidden">
          {/* Now playing bar */}
          {currentTrack && (
            <div className="flex items-center gap-4 p-3 bg-muted/50 border-b border-border">
              {currentTrack.album?.images?.[0]?.url && (
                <img src={currentTrack.album.images[0].url} alt="" className="h-14 w-14 rounded object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{currentTrack.name}</div>
                <div className="text-xs text-muted-foreground truncate">{currentTrack.artists?.map(a => a.name).join(', ')}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => skipMutation.mutate('previous')}
                  disabled={skipMutation.isPending}
                  className="p-2 hover:bg-muted rounded-full text-foreground disabled:opacity-50"
                >
                  <SkipBack className="h-4 w-4" />
                </button>
                <button
                  onClick={() => togglePlayMutation.mutate()}
                  disabled={togglePlayMutation.isPending}
                  className="p-3 bg-arav rounded-full hover:bg-arav/90 transition-colors disabled:opacity-50"
                >
                  {togglePlayMutation.isPending ? (
                    <Loader2 className="h-4 w-4 text-arav-foreground animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="h-4 w-4 text-arav-foreground" />
                  ) : (
                    <Play className="h-4 w-4 text-arav-foreground" />
                  )}
                </button>
                <button
                  onClick={() => skipMutation.mutate('next')}
                  disabled={skipMutation.isPending}
                  className="p-2 hover:bg-muted rounded-full text-foreground disabled:opacity-50"
                >
                  <SkipForward className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-6">
            {view === 'home' && (
              <>
                <h2 className="text-2xl font-bold text-foreground mb-4">Good {getTimeOfDay()}</h2>
                
                <div className="mb-8">
                  <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-3">Recently Played</h3>
                  {recentLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                  ) : recentError ? (
                    <div className="text-center py-8">
                      <p className="text-agni text-sm">{(recentError as Error).message}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {recentTracks?.items?.slice(0, 8).map((item: any, i: number) => (
                        <button
                          key={i}
                          onClick={() => playTrack(item.track.uri)}
                          disabled={playMutation.isPending}
                          className="flex items-center gap-3 p-2 rounded-md bg-card hover:bg-muted transition-colors group border border-border disabled:opacity-50"
                        >
                          <img src={item.track.album?.images?.[0]?.url} alt="" className="h-12 w-12 rounded object-cover" />
                          <span className="text-sm text-foreground truncate">{item.track.name}</span>
                          <Play className="h-8 w-8 p-2 rounded-full bg-arav text-arav-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-3">Your Playlists</h3>
                  {playlistsLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                  ) : playlistsError ? (
                    <div className="text-center py-8">
                      <p className="text-agni text-sm">{(playlistsError as Error).message}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {playlists?.items?.slice(0, 8).map((p: any) => (
                        <button
                          key={p.id}
                          onClick={() => { setSelectedPlaylistId(p.id); setView('playlist') }}
                          className="p-3 rounded-md bg-card hover:bg-muted transition-colors text-left group border border-border"
                        >
                          <div className="relative mb-2">
                            <img
                              src={p.images?.[0]?.url || '/placeholder.png'}
                              alt=""
                              className="aspect-square rounded object-cover w-full"
                            />
                            <Play className="absolute bottom-2 right-2 h-10 w-10 p-2 rounded-full bg-arav text-arav-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
                          </div>
                          <div className="text-sm font-medium text-foreground truncate">{p.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{p.tracks?.total || 0} tracks</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {view === 'search' && (
              <>
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search for songs, albums, artists..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {searchLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : searchError ? (
                  <div className="text-center py-8">
                    <p className="text-agni text-sm">{(searchError as Error).message}</p>
                  </div>
                ) : searchResults?.tracks?.items?.length > 0 ? (
                  <div className="space-y-1">
                    {searchResults.tracks.items.map((track: SpotifyTrack) => (
                      <button
                        key={track.id}
                        onClick={() => playTrack(track.uri)}
                        disabled={playMutation.isPending}
                        className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors group disabled:opacity-50"
                      >
                        <img src={track.album?.images?.[0]?.url} alt="" className="h-12 w-12 rounded object-cover" />
                        <div className="flex-1 text-left">
                          <div className="text-sm text-foreground">{track.name}</div>
                          <div className="text-xs text-muted-foreground">{track.artists?.map(a => a.name).join(', ')}</div>
                        </div>
                        <Play className="h-8 w-8 p-1 rounded-full bg-arav text-arav-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                ) : searchQuery.length > 2 ? (
                  <div className="text-center text-muted-foreground py-8">No results found</div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">Type to search</div>
                )}
              </>
            )}

            {view === 'playlists' && (
              <>
                <h2 className="text-2xl font-bold text-foreground mb-4">Your Library</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {playlistsLoading ? (
                    <div className="col-span-full flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                  ) : playlists?.items?.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedPlaylistId(p.id); setView('playlist') }}
                      className="p-3 rounded-md bg-card hover:bg-muted transition-colors text-left group border border-border"
                    >
                      <div className="relative mb-2">
                        <img src={p.images?.[0]?.url || '/placeholder.png'} alt="" className="aspect-square rounded object-cover w-full" />
                        <Play className="absolute bottom-2 right-2 h-10 w-10 p-2 rounded-full bg-arav text-arav-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
                      </div>
                      <div className="text-sm font-medium text-foreground truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{p.tracks?.total || 0} tracks</div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {view === 'playlist' && selectedPlaylistId && (
              <>
                <button onClick={() => setView('playlists')} className="text-sm text-muted-foreground hover:text-foreground mb-4">
                  ← Back to Library
                </button>
                {playlistLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : playlistDetail && (
                  <div>
                    <div className="flex items-end gap-4 mb-6">
                      <img src={playlistDetail.images?.[0]?.url} alt="" className="h-40 w-40 rounded shadow-2xl" />
                      <div>
                        <div className="text-xs uppercase text-muted-foreground">Playlist</div>
                        <h2 className="text-3xl font-bold text-foreground">{playlistDetail.name}</h2>
                        <div className="text-sm text-muted-foreground mt-1">{playlistDetail.tracks?.total || 0} songs</div>
                      </div>
                    </div>
                    <button
                      onClick={() => playPlaylist(playlistDetail.uri)}
                      disabled={playMutation.isPending}
                      className="mb-4 inline-flex items-center gap-2 px-6 py-2 bg-arav text-arav-foreground rounded-full font-medium hover:bg-arav/90 transition-colors disabled:opacity-50"
                    >
                      {playMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Play
                    </button>
                    <div className="space-y-1">
                      {playlistDetail.tracks?.items?.map((item: any, i: number) => (
                        <button
                          key={item.track?.id || i}
                          onClick={() => playTrack(item.track?.uri)}
                          disabled={playMutation.isPending}
                          className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors group disabled:opacity-50"
                        >
                          <span className="w-6 text-center text-xs text-muted-foreground">{i + 1}</span>
                          <img src={item.track?.album?.images?.[0]?.url} alt="" className="h-10 w-10 rounded object-cover" />
                          <div className="flex-1 text-left">
                            <div className="text-sm text-foreground">{item.track?.name}</div>
                            <div className="text-xs text-muted-foreground">{item.track?.artists?.map((a: any) => a.name).join(', ')}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function getTimeOfDay(): string {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}
