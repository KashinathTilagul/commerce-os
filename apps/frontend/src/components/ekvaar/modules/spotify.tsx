'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Search, Home, Heart, ListMusic, User, Play, Pause, SkipBack, SkipForward, Loader2, LogOut, Volume2 } from 'lucide-react'
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

export function SpotifyApp() {
  const [token, setToken] = useState<string | null>(null)
  const [player, setPlayer] = useState<any>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null)
  const [view, setView] = useState<'home' | 'search' | 'playlists' | 'playlist'>('home')
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [user, setUser] = useState<{ displayName: string; imageUrl?: string } | null>(null)
  const playerRef = useRef<any>(null)

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

  useEffect(() => {
    if (!token) return

    const script = document.createElement('script')
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    script.async = true
    document.body.appendChild(script)

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: 'EKVAAR OS Player',
        getOAuthToken: (cb: (t: string) => void) => cb(token),
        volume: 0.5,
      })

      playerRef.current = player
      setPlayer(player)

      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        console.log('Spotify player ready with device ID:', device_id)
        setDeviceId(device_id)
      })

      player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        console.log('Device ID has gone offline:', device_id)
      })

      player.addListener('player_state_changed', (state: any) => {
        if (!state) return

        setCurrentTrack(state.track_window.current_track)
        setIsPaused(state.paused)

        player.getCurrentState().then((state: any) => {
          setIsActive(!!state)
        })
      })

      player.addListener('initialization_error', ({ message }: { message: string }) => {
        console.error('Init error:', message)
      })

      player.addListener('authentication_error', ({ message }: { message: string }) => {
        console.error('Auth error:', message)
        fetch('/api/spotify/token')
          .then(r => r.json())
          .then(data => {
            if (data.access_token) setToken(data.access_token)
          })
          .catch(() => setToken(null))
      })

      player.addListener('account_error', ({ message }: { message: string }) => {
        console.error('Account error:', message)
        toast.error('Spotify Premium Required', 'You need Spotify Premium to use playback')
      })

      player.connect()
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect()
      }
    }
  }, [token])

  const { data: playlists, isLoading: playlistsLoading, error: playlistsError } = useQuery({
    queryKey: ['spotify-playlists'],
    queryFn: async () => {
      const r = await fetch('/api/spotify/playlists')
      const data = await r.json()
      if (!r.ok) {
        throw new Error(data.details || data.error || 'Failed to load playlists')
      }
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
      if (!r.ok) {
        throw new Error(data.details || data.error || 'Failed to load recent tracks')
      }
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
      if (!r.ok) {
        throw new Error(data.details || data.error || 'Search failed')
      }
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
      if (playerRef.current) {
        playerRef.current.disconnect()
      }
      toast.success('Logged out', 'Spotify disconnected')
    },
  })

  const playTrack = async (trackUri: string) => {
    if (!deviceId || !token) return

    try {
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uris: [trackUri] }),
      })
    } catch (e) {
      console.error('Play error:', e)
    }
  }

  const transferPlayback = async () => {
    if (!deviceId || !token) return

    try {
      await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ device_ids: [deviceId], play: false }),
      })
      toast.success('Playback transferred', 'Now playing on EKVAAR OS Player')
    } catch (e) {
      console.error('Transfer error:', e)
    }
  }

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gradient-to-b from-[#121212] to-[#000]">
        <svg className="h-16 w-16 text-[#1DB954] mb-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.899 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.381z"/>
        </svg>
        <h1 className="text-3xl font-bold text-white mb-2">Spotify</h1>
        <p className="text-white/60 mb-6">Stream your music library</p>
        <a
          href="/api/spotify/login"
          className="inline-flex items-center gap-2 px-8 py-3 bg-[#1DB954] hover:bg-[#1ed760] text-black rounded-full font-semibold transition-colors"
        >
          Connect with Spotify
        </a>
        <p className="text-xs text-white/40 mt-4">Requires Spotify Premium</p>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-52 bg-black border-r border-white/10 flex flex-col">
        <div className="p-4 flex items-center gap-2">
          <svg className="h-8 w-8 text-[#1DB954]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.899 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.381z"/>
          </svg>
          <span className="font-bold text-white">Spotify</span>
        </div>

        <nav className="flex-1 p-2">
          <button
            onClick={() => { setView('home'); setSelectedPlaylistId(null) }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm ${view === 'home' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'}`}
          >
            <Home className="h-4 w-4" /> Home
          </button>
          <button
            onClick={() => { setView('search'); setSelectedPlaylistId(null) }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm ${view === 'search' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'}`}
          >
            <Search className="h-4 w-4" /> Search
          </button>
          <button
            onClick={() => { setView('playlists'); setSelectedPlaylistId(null) }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm ${view === 'playlists' || view === 'playlist' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'}`}
          >
            <ListMusic className="h-4 w-4" /> Your Library
          </button>
        </nav>

        {/* Playback status */}
        {deviceId && !isActive && (
          <div className="p-3 mx-2 mb-2 bg-white/5 rounded-md">
            <p className="text-xs text-white/40 mb-2">Player not active</p>
            <Button size="sm" className="w-full bg-[#1DB954] text-black hover:bg-[#1ed760]" onClick={transferPlayback}>
              Transfer Playback
            </Button>
          </div>
        )}

        {/* User */}
        <div className="p-3 border-t border-white/10">
          {user && (
            <div className="flex items-center gap-2 mb-2">
              {user.imageUrl ? (
                <img src={user.imageUrl} alt="" className="h-8 w-8 rounded-full" />
              ) : (
                <User className="h-8 w-8 rounded-full bg-white/10 p-1 text-white" />
              )}
              <span className="text-sm text-white truncate">{user.displayName}</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-white/60 hover:text-white justify-start"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogOut className="h-4 w-4 mr-2" />}
            Disconnect
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col bg-gradient-to-b from-[#121212] to-[#000] overflow-hidden">
        {/* Now playing bar */}
        {currentTrack && (
          <div className="flex items-center gap-4 p-3 bg-[#181818] border-b border-white/10">
            {currentTrack.album?.images?.[0]?.url && (
              <img src={currentTrack.album.images[0].url} alt="" className="h-14 w-14 rounded object-cover" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{currentTrack.name}</div>
              <div className="text-xs text-white/60 truncate">{currentTrack.artists?.map(a => a.name).join(', ')}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => player?.previousTrack()}
                className="p-2 hover:bg-white/10 rounded-full text-white"
              >
                <SkipBack className="h-4 w-4" />
              </button>
              <button
                onClick={() => player?.togglePlay()}
                className="p-3 bg-white rounded-full hover:scale-105 transition-transform"
              >
                {isPaused ? <Play className="h-4 w-4 text-black" /> : <Pause className="h-4 w-4 text-black" />}
              </button>
              <button
                onClick={() => player?.nextTrack()}
                className="p-2 hover:bg-white/10 rounded-full text-white"
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
              <h2 className="text-2xl font-bold text-white mb-4">Good {getTimeOfDay()}</h2>
              
              <div className="mb-8">
                <h3 className="text-sm uppercase tracking-wider text-white/60 mb-3">Recently Played</h3>
                {recentLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-white/60" /></div>
                ) : recentError ? (
                  <div className="text-center py-8">
                    <p className="text-red-400 text-sm">{(recentError as Error).message}</p>
                    <p className="text-white/40 text-xs mt-2">Try disconnecting and reconnecting Spotify</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {recentTracks?.items?.slice(0, 8).map((item: any, i: number) => (
                      <button
                        key={i}
                        onClick={() => playTrack(item.track.uri)}
                        className="flex items-center gap-3 p-2 rounded-md bg-white/5 hover:bg-white/10 transition-colors group"
                      >
                        <img src={item.track.album?.images?.[0]?.url} alt="" className="h-12 w-12 rounded object-cover" />
                        <span className="text-sm text-white truncate">{item.track.name}</span>
                        <Play className="h-8 w-8 p-2 rounded-full bg-[#1DB954] text-black ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm uppercase tracking-wider text-white/60 mb-3">Your Playlists</h3>
                {playlistsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-white/60" /></div>
                ) : playlistsError ? (
                  <div className="text-center py-8">
                    <p className="text-red-400 text-sm">{(playlistsError as Error).message}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {playlists?.items?.slice(0, 8).map((p: any) => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedPlaylistId(p.id); setView('playlist') }}
                        className="p-3 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-left group"
                      >
                        <div className="relative mb-2">
                          <img
                            src={p.images?.[0]?.url || '/placeholder.png'}
                            alt=""
                            className="aspect-square rounded object-cover w-full"
                          />
                          <Play className="absolute bottom-2 right-2 h-10 w-10 p-2 rounded-full bg-[#1DB954] text-black opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
                        </div>
                        <div className="text-sm font-medium text-white truncate">{p.name}</div>
                        <div className="text-xs text-white/60 truncate">{p.tracks?.total || 0} tracks</div>
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/60" />
                <Input
                  placeholder="Search for songs, albums, artists..."
                  className="pl-10 bg-white text-black rounded-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {searchLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-white/60" /></div>
              ) : searchError ? (
                <div className="text-center py-8">
                  <p className="text-red-400 text-sm">{(searchError as Error).message}</p>
                </div>
              ) : searchResults?.tracks?.items?.length > 0 ? (
                <div className="space-y-1">
                  {searchResults.tracks.items.map((track: SpotifyTrack) => (
                    <button
                      key={track.id}
                      onClick={() => playTrack(track.uri)}
                      className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-white/10 transition-colors group"
                    >
                      <img src={track.album?.images?.[0]?.url} alt="" className="h-12 w-12 rounded object-cover" />
                      <div className="flex-1 text-left">
                        <div className="text-sm text-white">{track.name}</div>
                        <div className="text-xs text-white/60">{track.artists?.map(a => a.name).join(', ')}</div>
                      </div>
                      <Play className="h-8 w-8 p-1 rounded-full bg-[#1DB954] text-black opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              ) : searchQuery.length > 2 ? (
                <div className="text-center text-white/60 py-8">No results found</div>
              ) : (
                <div className="text-center text-white/60 py-8">Type to search</div>
              )}
            </>
          )}

          {view === 'playlists' && (
            <>
              <h2 className="text-2xl font-bold text-white mb-4">Your Library</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {playlistsLoading ? (
                  <div className="col-span-full flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-white/60" /></div>
                ) : playlists?.items?.map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedPlaylistId(p.id); setView('playlist') }}
                    className="p-3 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-left group"
                  >
                    <div className="relative mb-2">
                      <img src={p.images?.[0]?.url || '/placeholder.png'} alt="" className="aspect-square rounded object-cover w-full" />
                      <Play className="absolute bottom-2 right-2 h-10 w-10 p-2 rounded-full bg-[#1DB954] text-black opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
                    </div>
                    <div className="text-sm font-medium text-white truncate">{p.name}</div>
                    <div className="text-xs text-white/60 truncate">{p.tracks?.total || 0} tracks</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {view === 'playlist' && selectedPlaylistId && (
            <>
              <button onClick={() => setView('playlists')} className="text-sm text-white/60 hover:text-white mb-4">
                ← Back to Library
              </button>
              {playlistLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-white/60" /></div>
              ) : playlistDetail && (
                <div>
                  <div className="flex items-end gap-4 mb-6">
                    <img src={playlistDetail.images?.[0]?.url} alt="" className="h-40 w-40 rounded shadow-2xl" />
                    <div>
                      <div className="text-xs uppercase text-white/60">Playlist</div>
                      <h2 className="text-3xl font-bold text-white">{playlistDetail.name}</h2>
                      <div className="text-sm text-white/60 mt-1">{playlistDetail.tracks?.total || 0} songs</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const firstTrack = playlistDetail.tracks?.items?.[0]?.track
                      if (firstTrack) playTrack(firstTrack.uri)
                    }}
                    className="mb-4 inline-flex items-center gap-2 px-6 py-2 bg-[#1DB954] text-black rounded-full font-medium hover:scale-105 transition-transform"
                  >
                    <Play className="h-4 w-4" /> Play
                  </button>
                  <div className="space-y-1">
                    {playlistDetail.tracks?.items?.map((item: any, i: number) => (
                      <button
                        key={item.track?.id || i}
                        onClick={() => playTrack(item.track?.uri)}
                        className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-white/10 transition-colors group"
                      >
                        <span className="w-6 text-center text-xs text-white/40">{i + 1}</span>
                        <img src={item.track?.album?.images?.[0]?.url} alt="" className="h-10 w-10 rounded object-cover" />
                        <div className="flex-1 text-left">
                          <div className="text-sm text-white">{item.track?.name}</div>
                          <div className="text-xs text-white/60">{item.track?.artists?.map((a: any) => a.name).join(', ')}</div>
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
  )
}

function getTimeOfDay(): string {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}
