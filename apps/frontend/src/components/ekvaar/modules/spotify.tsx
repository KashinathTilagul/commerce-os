'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Home, Music2, Heart, ListMusic, Disc3, User, Play, Pause, Clock, Loader2, LogOut } from 'lucide-react'
import { PageHeader } from '../shared'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ekvaar/desktop/toast'
import { useMusicStore, Track } from '@/lib/music-store'

declare global {
  interface Window {
    Spotify: any
    onSpotifyWebPlaybackSDKReady: () => void
  }
}

export function SpotifyApp() {
  const [view, setView] = useState<'home' | 'search' | 'playlists' | 'playlist' | 'liked'>('home')
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [playerReady, setPlayerReady] = useState(false)
  const queryClient = useQueryClient()
  const { isConnected, user, setConnected, setUser, setDeviceId, setTracks, playTrack, disconnect } = useMusicStore()

  useEffect(() => {
    const accessToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('spotify_access_token='))
      ?.split('=')[1]
    
    if (accessToken) {
      setToken(accessToken)
      setConnected(true)
    }
  }, [setConnected])

  useEffect(() => {
    if (!token) return

    fetch('/api/spotify/me')
      .then(r => r.json())
      .then(data => {
        if (data.display_name) {
          setUser({
            displayName: data.display_name,
            imageUrl: data.images?.[0]?.url,
            product: data.product,
          })
        }
      })
      .catch(() => {})
  }, [token, setUser])

  useEffect(() => {
    if (!token) return

    const loadSDK = () => {
      if (window.Spotify) {
        const player = new window.Spotify.Player({
          name: 'EKVAAR OS Player',
          getOAuthToken: (cb: (t: string) => void) => cb(token),
          volume: useMusicStore.getState().volume / 100,
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
      } else {
        setTimeout(loadSDK, 100)
      }
    }

    if (!document.getElementById('spotify-sdk')) {
      const script = document.createElement('script')
      script.src = 'https://sdk.scdn.co/spotify-player.js'
      script.id = 'spotify-sdk'
      document.body.appendChild(script)
      window.onSpotifyWebPlaybackSDKReady = loadSDK
    } else {
      loadSDK()
    }
  }, [token, setDeviceId])

  const { data: playlists, isLoading: playlistsLoading } = useQuery({
    queryKey: ['spotify-playlists'],
    queryFn: async () => {
      const r = await fetch('/api/spotify/playlists')
      if (!r.ok) throw new Error('Failed')
      return r.json()
    },
    enabled: !!token,
  })

  const { data: recentTracks, isLoading: recentLoading } = useQuery({
    queryKey: ['spotify-recent'],
    queryFn: async () => {
      const r = await fetch('/api/spotify/recent')
      if (!r.ok) throw new Error('Failed')
      return r.json()
    },
    enabled: !!token && view === 'home',
  })

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['spotify-search', searchQuery],
    queryFn: async () => {
      const r = await fetch(`/api/spotify/search?q=${encodeURIComponent(searchQuery)}`)
      if (!r.ok) throw new Error('Failed')
      return r.json()
    },
    enabled: !!token && searchQuery.length > 2,
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
      const r = await fetch('/api/spotify/logout', { method: 'POST' })
      if (!r.ok) throw new Error('Failed')
    },
    onSuccess: () => {
      disconnect()
      setToken(null)
      toast.success('Logged out', 'Spotify disconnected')
    },
  })

  const playTrackFromSpotify = (track: any) => {
    const t: Track = {
      id: track.id,
      title: track.name,
      artist: track.artists?.map((a: any) => a.name).join(', ') || 'Unknown',
      spotifyUri: track.uri,
      thumbnail: track.album?.images?.[0]?.url || track.images?.[0]?.url,
      album: track.album?.name,
      duration: track.duration_ms,
    }
    useMusicStore.getState().addTrack(t)
    const idx = useMusicStore.getState().tracks.length
    playTrack(idx - 1)
  }

  const playPlaylist = (playlistId: string) => {
    setSelectedPlaylistId(playlistId)
    setView('playlist')
  }

  if (!token) {
    return (
      <div>
        <PageHeader eyebrow="Spotify" title="Music" description="Stream your Spotify library" />
        <div className="flex flex-col items-center justify-center py-24">
          <a
            href="/api/spotify/login"
            className="inline-flex items-center gap-3 px-6 py-3 bg-[#1DB954] hover:bg-[#1ed760] text-white rounded-full transition-colors"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.899 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.381z"/>
            </svg>
            Connect with Spotify
          </a>
          <p className="text-sm text-muted-foreground mt-4">Requires Spotify Premium</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <div className="w-52 bg-black border-r border-border flex flex-col">
        <div className="p-4 flex items-center gap-2">
          <svg className="h-8 w-8 text-[#1DB954]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.899 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.381z"/>
          </svg>
          <span className="font-bold text-white">Spotify</span>
        </div>

        <nav className="flex-1 p-2">
          <button
            onClick={() => setView('home')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm ${view === 'home' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'}`}
          >
            <Home className="h-4 w-4" /> Home
          </button>
          <button
            onClick={() => setView('search')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm ${view === 'search' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'}`}
          >
            <Search className="h-4 w-4" /> Search
          </button>
          <button
            onClick={() => setView('playlists')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm ${view === 'playlists' || view === 'playlist' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'}`}
          >
            <ListMusic className="h-4 w-4" /> Your Library
          </button>
          <button
            onClick={() => setView('liked')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm ${view === 'liked' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'}`}
          >
            <Heart className="h-4 w-4" /> Liked Songs
          </button>
        </nav>

        <div className="p-3 border-t border-white/10">
          {user && (
            <div className="flex items-center gap-2 mb-2">
              {user.imageUrl ? (
                <img src={user.imageUrl} alt="" className="h-8 w-8 rounded-full" />
              ) : (
                <User className="h-8 w-8 rounded-full bg-white/10 p-1" />
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

      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#121212] to-[#000]">
        {view === 'home' && (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Good {getTimeOfDay()}</h2>
            
            <div className="mb-8">
              <h3 className="text-sm uppercase tracking-wider text-white/60 mb-3">Recently Played</h3>
              {recentLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-white/60" /></div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {recentTracks?.items?.slice(0, 8).map((item: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => playTrackFromSpotify(item.track)}
                      className="flex items-center gap-3 p-2 rounded-md bg-white/5 hover:bg-white/10 transition-colors group"
                    >
                      <img
                        src={item.track.album?.images?.[0]?.url}
                        alt=""
                        className="h-12 w-12 rounded object-cover"
                      />
                      <span className="text-sm text-white truncate">{item.track.name}</span>
                      <Play className="h-8 w-8 p-2 rounded-full bg-[#1DB954] text-black ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm uppercase tracking-wider text-white/60 mb-3">Your Playlists</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {playlists?.items?.slice(0, 8).map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => playPlaylist(p.id)}
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
            </div>
          </div>
        )}

        {view === 'search' && (
          <div className="p-6">
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
            ) : searchResults?.tracks?.items?.length > 0 ? (
              <div>
                <h3 className="text-sm uppercase tracking-wider text-white/60 mb-3">Tracks</h3>
                <div className="space-y-1">
                  {searchResults.tracks.items.map((track: any) => (
                    <button
                      key={track.id}
                      onClick={() => playTrackFromSpotify(track)}
                      className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-white/10 transition-colors"
                    >
                      <img src={track.album?.images?.[0]?.url} alt="" className="h-12 w-12 rounded object-cover" />
                      <div className="flex-1 text-left">
                        <div className="text-sm text-white">{track.name}</div>
                        <div className="text-xs text-white/60">{track.artists?.map((a: any) => a.name).join(', ')}</div>
                      </div>
                      <span className="text-xs text-white/40">{formatDuration(track.duration_ms)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : searchQuery.length > 2 ? (
              <div className="text-center text-white/60 py-8">No results found</div>
            ) : (
              <div className="text-center text-white/60 py-8">Type to search</div>
            )}
          </div>
        )}

        {view === 'playlists' && (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Your Library</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {playlistsLoading ? (
                <div className="col-span-full flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-white/60" /></div>
              ) : playlists?.items?.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => playPlaylist(p.id)}
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
          </div>
        )}

        {view === 'playlist' && selectedPlaylistId && (
          <div className="p-6">
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
                    const tracks = playlistDetail.tracks?.items || []
                    setTracks([])
                    tracks.forEach((item: any) => {
                      const t: Track = {
                        id: item.track.id,
                        title: item.track.name,
                        artist: item.track.artists?.map((a: any) => a.name).join(', '),
                        spotifyUri: item.track.uri,
                        thumbnail: item.track.album?.images?.[0]?.url,
                      }
                      useMusicStore.getState().addTrack(t)
                    })
                    playTrack(0)
                  }}
                  className="mb-4 inline-flex items-center gap-2 px-6 py-2 bg-[#1DB954] text-black rounded-full font-medium hover:scale-105 transition-transform"
                >
                  <Play className="h-4 w-4" /> Play
                </button>
                <div className="space-y-1">
                  {playlistDetail.tracks?.items?.map((item: any, i: number) => (
                    <button
                      key={item.track?.id || i}
                      onClick={() => playTrackFromSpotify(item.track)}
                      className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-white/10 transition-colors group"
                    >
                      <span className="w-6 text-center text-xs text-white/40">{i + 1}</span>
                      <img src={item.track?.album?.images?.[0]?.url} alt="" className="h-10 w-10 rounded object-cover" />
                      <div className="flex-1 text-left">
                        <div className="text-sm text-white">{item.track?.name}</div>
                        <div className="text-xs text-white/60">{item.track?.artists?.map((a: any) => a.name).join(', ')}</div>
                      </div>
                      <span className="text-xs text-white/40">{formatDuration(item.track?.duration_ms)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'liked' && (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Liked Songs</h2>
            <p className="text-white/60">Your liked songs will appear here.</p>
          </div>
        )}
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

function formatDuration(ms: number): string {
  const min = Math.floor(ms / 60000)
  const sec = Math.floor((ms % 60000) / 1000)
  return `${min}:${sec.toString().padStart(2, '0')}`
}
