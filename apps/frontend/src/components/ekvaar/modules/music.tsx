'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, SkipBack, SkipForward, Heart, Youtube, Clock, X, ListMusic, Volume2, ExternalLink } from 'lucide-react'
import { PageHeader } from '../shared'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Track = { id: string; title: string; artist: string; type: 'youtube'; url: string; videoId: string }

const extractVideoId = (url: string): string | null => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

const DEFAULT_TRACKS: Track[] = [
  { id: '1', title: 'Lo-Fi Hip Hop Radio', artist: 'Lofi Girl', type: 'youtube', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', videoId: 'jfKfPfyJRdk' },
  { id: '2', title: 'Jazz Relaxing Music', artist: 'Cafe Music BGM', type: 'youtube', url: 'https://www.youtube.com/watch?v=Dx5qFachdM8', videoId: 'Dx5qFachdM8' },
]

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

export function MusicPlayer() {
  const [tracks, setTracks] = useState<Track[]>(DEFAULT_TRACKS)
  const [history, setHistory] = useState<Track[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [ytUrl, setYtUrl] = useState('')
  const [tab, setTab] = useState('playlist')
  const [playerReady, setPlayerReady] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const playerRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const current = tracks[currentIdx]

  useEffect(() => {
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.body.appendChild(tag)

    window.onYouTubeIframeAPIReady = () => {
      setPlayerReady(true)
    }

    return () => {
      const scripts = document.querySelectorAll('script[src="https://www.youtube.com/iframe_api"]')
      scripts.forEach(s => s.remove())
    }
  }, [])

  useEffect(() => {
    if (!playerReady || !current || !containerRef.current) return

    if (playerRef.current) {
      playerRef.current.destroy()
    }

    containerRef.current.innerHTML = ''
    const div = document.createElement('div')
    div.id = 'yt-player'
    containerRef.current.appendChild(div)

    playerRef.current = new window.YT.Player('yt-player', {
      videoId: current.videoId,
      height: '100%',
      width: '100%',
      playerVars: {
        autoplay: playing ? 1 : 0,
        controls: 0,
        modestbranding: 1,
      },
      events: {
        onReady: (e: any) => {
          setDuration(e.target.getDuration())
          if (playing) e.target.playVideo()
        },
        onStateChange: (e: any) => {
          if (e.data === window.YT.PlayerState.ENDED) {
            playNext()
          }
          if (e.data === window.YT.PlayerState.PLAYING) {
            setPlaying(true)
          }
          if (e.data === window.YT.PlayerState.PAUSED) {
            setPlaying(false)
          }
        },
      },
    })
  }, [playerReady, current?.id])

  useEffect(() => {
    if (!playerRef.current?.playVideo) return
    if (playing) {
      playerRef.current.playVideo()
    } else {
      playerRef.current.pauseVideo()
    }
  }, [playing])

  useEffect(() => {
    if (!playerRef.current?.getCurrentTime) return
    const interval = setInterval(() => {
      if (playing) {
        setProgress(playerRef.current.getCurrentTime())
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [playing])

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  const toggleLike = (id: string) => setLiked(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const playTrack = (idx: number) => { setCurrentIdx(idx); setPlaying(true); if (tracks[idx]) setHistory(p => [tracks[idx], ...p.filter(t => t.id !== tracks[idx].id).slice(0, 49)]) }
  const playNext = () => playTrack((currentIdx + 1) % tracks.length)
  const playPrev = () => playTrack((currentIdx - 1 + tracks.length) % tracks.length)
  const removeTrack = (idx: number) => { setTracks(p => p.filter((_, i) => i !== idx)); if (idx === currentIdx) { setPlaying(false); setCurrentIdx(0) } }

  const addYtTrack = () => {
    const videoId = extractVideoId(ytUrl)
    if (!videoId) return
    const id = `yt-${Date.now()}`
    const track: Track = { id, title: 'YouTube Track', artist: 'YouTube', type: 'youtube', url: ytUrl, videoId }
    setTracks(p => [...p, track])
    setYtUrl('')
  }

  return (
    <div>
      <PageHeader eyebrow="Music" title="EKVAAR Sound" description="Stream YouTube directly in-app." />
      <div className="px-4 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <div ref={containerRef} className="aspect-video rounded-lg bg-black mb-4 overflow-hidden flex items-center justify-center">
              {!playerReady && <Youtube className="h-12 w-12 text-muted-foreground" />}
            </div>
            <div className="flex items-center justify-between mb-4">
              <div className="min-w-0"><div className="font-medium truncate">{current?.title || 'No track'}</div><div className="text-xs text-muted-foreground">{current?.artist}</div></div>
              {current && <button onClick={() => toggleLike(current.id)}><Heart className={`h-5 w-5 ${liked.has(current.id) ? 'fill-agni text-agni' : 'text-muted-foreground'}`} /></button>}
            </div>
            <div className="mb-4">
              <div className="h-1 bg-muted rounded-full mb-2"><div className="h-full bg-primary rounded-full transition-all" style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }} /></div>
              <div className="flex justify-between text-xs text-muted-foreground font-mono"><span>{fmtTime(progress)}</span><span>{fmtTime(duration)}</span></div>
            </div>
            <div className="flex items-center justify-center gap-4 mb-4">
              <button onClick={playPrev} className="p-2 hover:bg-muted rounded-full"><SkipBack className="h-5 w-5" fill="currentColor" /></button>
              <button onClick={() => setPlaying(p => !p)} className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center">{playing ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5 ml-0.5" fill="currentColor" />}</button>
              <button onClick={playNext} className="p-2 hover:bg-muted rounded-full"><SkipForward className="h-5 w-5" fill="currentColor" /></button>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            <Tabs value={tab} onValueChange={setTab} className="w-full">
              <div className="p-4 border-b border-border"><TabsList className="grid grid-cols-3 w-full max-w-md"><TabsTrigger value="playlist"><ListMusic className="h-4 w-4 mr-1" />Playlist</TabsTrigger><TabsTrigger value="add"><Youtube className="h-4 w-4 mr-1" />Add</TabsTrigger><TabsTrigger value="history"><Clock className="h-4 w-4 mr-1" />History</TabsTrigger></TabsList></div>
              <TabsContent value="playlist" className="m-0">
                <div className="max-h-[400px] overflow-y-auto">{tracks.map((t, i) => (
                  <div key={t.id} className={`flex items-center gap-3 p-3 border-b border-border/60 hover:bg-muted/40 cursor-pointer ${i === currentIdx ? 'bg-muted/60' : ''}`} onClick={() => playTrack(i)}>
                    <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 bg-muted"><Youtube className="h-4 w-4" /></div>
                    <div className="flex-1 min-w-0"><div className="text-sm truncate">{t.title}</div><div className="text-xs text-muted-foreground">{t.artist}</div></div>
                    <button onClick={e => { e.stopPropagation(); toggleLike(t.id) }}><Heart className={`h-4 w-4 ${liked.has(t.id) ? 'fill-agni text-agni' : 'text-muted-foreground/40'}`} /></button>
                    <button onClick={e => { e.stopPropagation(); removeTrack(i) }}><X className="h-4 w-4 text-muted-foreground hover:text-agni" /></button>
                  </div>
                ))}</div>
              </TabsContent>
              <TabsContent value="add" className="m-0 p-6">
                <div className="space-y-2"><label className="text-sm font-medium">YouTube URL</label><div className="flex gap-2"><input type="text" placeholder="https://youtube.com/watch?v=..." value={ytUrl} onChange={e => setYtUrl(e.target.value)} className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-transparent" /><button onClick={addYtTrack} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90">Add</button></div></div>
              </TabsContent>
              <TabsContent value="history" className="m-0">
                <div className="max-h-[400px] overflow-y-auto">{history.length === 0 ? <div className="p-8 text-center text-muted-foreground text-sm">No history yet</div> : history.map(t => (
                  <div key={t.id + '-hist'} className="flex items-center gap-3 p-3 border-b border-border/60 hover:bg-muted/40 cursor-pointer" onClick={() => { const idx = tracks.findIndex(tr => tr.id === t.id); if (idx >= 0) playTrack(idx) }}>
                    <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 bg-muted"><Clock className="h-4 w-4 text-muted-foreground" /></div>
                    <div className="flex-1 min-w-0"><div className="text-sm truncate">{t.title}</div><div className="text-xs text-muted-foreground">{t.artist}</div></div>
                  </div>
                ))}</div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
