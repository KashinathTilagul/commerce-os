'use client'

import { useMusicStore } from '@/lib/music-store'
import { useEffect, useRef, useState } from 'react'
import { Search, Heart, Youtube, Clock, X, ChevronUp, ChevronDown, GripVertical } from 'lucide-react'

const extractVideoId = (url: string): string | null => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

export function GlobalMusicPlayer() {
  const { tracks, currentIdx, playing, volume, minimized, position, addTrack, playTrack, toggleMinimize, move, stop } = useMusicStore()
  const current = tracks[currentIdx]
  const playerRef = useRef<HTMLDivElement>(null)
  const ytPlayer = useRef<any>(null)
  const [playerReady, setPlayerReady] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [dragging, setDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!current) return
    const playerId = 'yt-global-player'
    if (!document.getElementById(playerId)) {
      playerRef.current!.innerHTML = `<div id="${playerId}"></div>`
    }
    
    const loadYT = () => {
      if ((window as any).YT && (window as any).YT.Player) {
        ytPlayer.current = new (window as any).YT.Player(playerId, {
          videoId: current.videoId,
          height: '100%',
          width: '100%',
          playerVars: { autoplay: 0, controls: 1, modestbranding: 1 },
          events: {
            onReady: () => {
              setPlayerReady(true)
              ytPlayer.current.setVolume(volume)
              if (playing) ytPlayer.current.playVideo()
            },
            onStateChange: (e: any) => {
              if (e.data === (window as any).YT.PlayerState.PLAYING) {
                useMusicStore.setState({ playing: true })
              } else if (e.data === (window as any).YT.PlayerState.PAUSED) {
                useMusicStore.setState({ playing: false })
              }
            }
          }
        })
      } else {
        setTimeout(loadYT, 100)
      }
    }
    
    if (!(window as any).YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.body.appendChild(tag)
      ;(window as any).onYouTubeIframeAPIReady = loadYT
    } else {
      loadYT()
    }
  }, [])

  useEffect(() => {
    if (!ytPlayer.current?.loadVideoById || !current) return
    ytPlayer.current.loadVideoById(current.videoId)
    if (playing) ytPlayer.current.playVideo()
  }, [current?.videoId])

  useEffect(() => {
    if (!ytPlayer.current || !playerReady) return
    playing ? ytPlayer.current.playVideo() : ytPlayer.current.pauseVideo()
  }, [playing])

  useEffect(() => {
    if (!ytPlayer.current?.setVolume) return
    ytPlayer.current.setVolume(volume)
  }, [volume])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.drag-handle')) {
      setDragging(true)
      dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y }
    }
  }

  useEffect(() => {
    if (!dragging) return
    const handleMouseMove = (e: MouseEvent) => {
      move({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y })
    }
    const handleMouseUp = () => setDragging(false)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging])

  const handleAddTrack = () => {
    const videoId = extractVideoId(searchQuery)
    if (!videoId) return
    const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    addTrack({ id: videoId, title: 'YouTube Track', artist: 'YouTube', videoId, thumbnail })
    playTrack(tracks.length)
    setSearchQuery('')
    setShowSearch(false)
  }

  if (!current && tracks.length === 0) return null

  return (
    <div
      ref={playerRef}
      onMouseDown={handleMouseDown}
      className={`fixed bg-card border border-border shadow-2xl rounded-lg overflow-hidden transition-all ${dragging ? 'cursor-grabbing' : ''}`}
      style={{
        left: position.x,
        top: position.y,
        width: minimized ? 280 : 320,
        zIndex: 10000,
      }}
    >
      {/* Header */}
      <div className="drag-handle flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border cursor-grab">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Youtube className="h-4 w-4 text-red-500 shrink-0" />
          <span className="text-xs font-medium truncate">{current?.title || 'Music'}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={toggleMinimize} className="p-1 hover:bg-muted rounded">
            {minimized ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          <button onClick={stop} className="p-1 hover:bg-muted rounded"><X className="h-3 w-3" /></button>
        </div>
      </div>

      {/* Player / Playlist */}
      {!minimized && (
        <div className="p-2">
          <div className="aspect-video rounded overflow-hidden bg-black mb-2">
            <div id="yt-global-player" className="w-full h-full" />
          </div>
          
          {/* Search */}
          <div className="mb-2">
            {showSearch ? (
              <div className="flex gap-1">
                <input
                  type="text"
                  placeholder="Paste YouTube URL..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-2 py-1 text-xs rounded border border-input bg-transparent"
                  autoFocus
                />
                <button onClick={handleAddTrack} className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded">+</button>
                <button onClick={() => setShowSearch(false)} className="p-1 hover:bg-muted rounded"><X className="h-3 w-3" /></button>
              </div>
            ) : (
              <button onClick={() => setShowSearch(true)} className="w-full flex items-center justify-center gap-1 py-1 text-xs hover:bg-muted rounded">
                <Search className="h-3 w-3" /> Add track
              </button>
            )}
          </div>

          {/* Playlist */}
          <div className="max-h-24 overflow-y-auto">
            {tracks.map((t, i) => (
              <div
                key={t.id}
                onClick={() => playTrack(i)}
                className={`flex items-center gap-2 p-1 rounded cursor-pointer text-xs ${i === currentIdx ? 'bg-muted' : 'hover:bg-muted/50'}`}
              >
                <img src={t.thumbnail} alt="" className="w-8 h-6 rounded object-cover" />
                <span className="truncate flex-1">{t.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
