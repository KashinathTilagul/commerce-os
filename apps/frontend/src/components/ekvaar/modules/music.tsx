'use client'

import { useState, useRef, useEffect } from 'react'
// @ts-ignore
import ReactPlayer from 'react-player/youtube'
import { Play, Pause, SkipBack, SkipForward, Volume2, Heart, Youtube, Upload, Clock, X, ListMusic } from 'lucide-react'
import { PageHeader } from '../shared'
import { Card, CardContent } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Track = { id: string; title: string; artist: string; duration?: number; type: 'youtube' | 'upload'; url: string; color?: string }

const DEFAULT_TRACKS: Track[] = [
  { id: 'yt1', title: 'Permanence', artist: 'EKVAAR Sound', type: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', color: '#0A0A0A' },
  { id: 'yt2', title: 'House of Originals', artist: 'EKVAAR Sound', type: 'youtube', url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw', color: '#1F3A5F' },
]

export function MusicPlayer() {
  const [tracks, setTracks] = useState<Track[]>(DEFAULT_TRACKS)
  const [history, setHistory] = useState<Track[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [volume, setVolume] = useState([70])
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [duration, setDuration] = useState(0)
  const [ytUrl, setYtUrl] = useState('')
  const [tab, setTab] = useState('playlist')
  const playerRef = useRef<ReactPlayer>(null)

  const current = tracks[currentIdx]
  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  const playTrack = (idx: number) => { setCurrentIdx(idx); setPlaying(true) }
  const toggleLike = (id: string) => setLiked(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })

  const addYtTrack = () => {
    if (!ytUrl || !ReactPlayer.canPlay(ytUrl)) return
    const id = `yt-${Date.now()}`
    const track: Track = { id, title: 'YouTube Track', artist: 'Unknown', type: 'youtube', url: ytUrl }
    setTracks(p => [...p, track])
    setYtUrl('')
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const url = URL.createObjectURL(file)
    const track: Track = { id: `up-${Date.now()}`, title: file.name, artist: 'Local', type: 'upload', url }
    setTracks(p => [...p, track])
  }

  const removeTrack = (idx: number) => { setTracks(p => p.filter((_, i) => i !== idx)); if (idx === currentIdx) setPlaying(false) }

  const onEnd = () => {
    if (current) setHistory(p => [current, ...p.slice(0, 49)])
    setCurrentIdx(i => (i + 1) % tracks.length)
  }

  useEffect(() => { if (playing && history[0]?.id !== current?.id && current) setHistory(p => [current, ...p.filter(t => t.id !== current.id).slice(0, 49)]) }, [playing, current])

  return (
    <div>
      <PageHeader eyebrow="Music" title="EKVAAR Sound" description="Play YouTube, upload tracks, build your playlist." />
      <div className="px-4 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <div className="aspect-video rounded-lg bg-muted/30 mb-4 overflow-hidden flex items-center justify-center">
              {current?.type === 'youtube' && playing ? (
                <ReactPlayer ref={playerRef} url={current.url} playing={playing} volume={volume[0] / 100} width="100%" height="100%" onDuration={setDuration} onProgress={p => setProgress(p.playedSeconds)} onEnded={onEnd} controls={false} />
              ) : (
                <div className="text-center p-4">
                  <Youtube className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{current?.title || 'Select a track'}</p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between mb-4">
              <div className="min-w-0"><div className="font-medium truncate">{current?.title || 'No track'}</div><div className="text-xs text-muted-foreground">{current?.artist}</div></div>
              {current && <button onClick={() => toggleLike(current.id)}><Heart className={`h-5 w-5 ${liked.has(current.id) ? 'fill-agni text-agni' : 'text-muted-foreground'}`} /></button>}
            </div>
            <div className="mb-4"><Slider value={[progress]} onValueChange={v => { setProgress(v[0]); playerRef.current?.seekTo(v[0], 'seconds') }} max={duration || 100} step={1} className="mb-2" /><div className="flex justify-between text-xs text-muted-foreground font-mono"><span>{fmtTime(progress)}</span><span>{fmtTime(duration)}</span></div></div>
            <div className="flex items-center justify-center gap-4 mb-4">
              <Button variant="ghost" size="icon" onClick={() => setCurrentIdx(i => (i - 1 + tracks.length) % tracks.length)}><SkipBack className="h-5 w-5" fill="currentColor" /></Button>
              <Button size="icon" className="h-12 w-12 rounded-full" onClick={() => setPlaying(p => !p)}>{playing ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5 ml-0.5" fill="currentColor" />}</Button>
              <Button variant="ghost" size="icon" onClick={() => setCurrentIdx(i => (i + 1) % tracks.length)}><SkipForward className="h-5 w-5" fill="currentColor" /></Button>
            </div>
            <div className="flex items-center gap-2"><Volume2 className="h-4 w-4 text-muted-foreground" /><Slider value={volume} onValueChange={setVolume} max={100} step={1} className="flex-1" /></div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            <Tabs value={tab} onValueChange={setTab} className="w-full">
              <div className="p-4 border-b border-border"><TabsList className="grid grid-cols-3 w-full max-w-md"><TabsTrigger value="playlist"><ListMusic className="h-4 w-4 mr-1" />Playlist</TabsTrigger><TabsTrigger value="add"><Youtube className="h-4 w-4 mr-1" />Add</TabsTrigger><TabsTrigger value="history"><Clock className="h-4 w-4 mr-1" />History</TabsTrigger></TabsList></div>
              <TabsContent value="playlist" className="m-0">
                <div className="max-h-[400px] overflow-y-auto">{tracks.map((t, i) => (
                  <div key={t.id} className={`flex items-center gap-3 p-3 border-b border-border/60 hover:bg-muted/40 cursor-pointer ${i === currentIdx ? 'bg-muted/60' : ''}`} onClick={() => playTrack(i)}>
                    <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 bg-muted"><span className="text-xs font-mono">{i + 1}</span></div>
                    <div className="flex-1 min-w-0"><div className="text-sm truncate">{t.title}</div><div className="text-xs text-muted-foreground">{t.artist}</div></div>
                    <button onClick={e => { e.stopPropagation(); toggleLike(t.id) }}><Heart className={`h-4 w-4 ${liked.has(t.id) ? 'fill-agni text-agni' : 'text-muted-foreground/40'}`} /></button>
                    <button onClick={e => { e.stopPropagation(); removeTrack(i) }}><X className="h-4 w-4 text-muted-foreground hover:text-agni" /></button>
                  </div>
                ))}</div>
              </TabsContent>
              <TabsContent value="add" className="m-0 p-6 space-y-4">
                <div className="space-y-2"><label className="text-sm font-medium">YouTube URL</label><div className="flex gap-2"><Input placeholder="https://youtube.com/watch?v=..." value={ytUrl} onChange={e => setYtUrl(e.target.value)} className="flex-1" /><Button onClick={addYtTrack}>Add</Button></div></div>
                <div className="space-y-2"><label className="text-sm font-medium">Upload Audio</label><div className="flex items-center gap-2"><Upload className="h-4 w-4 text-muted-foreground" /><input type="file" accept="audio/*" onChange={handleUpload} className="text-sm" /></div></div>
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
