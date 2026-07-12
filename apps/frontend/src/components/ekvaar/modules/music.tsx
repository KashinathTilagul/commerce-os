'use client'

import { useState } from 'react'
import { Play, Pause, SkipBack, SkipForward, Volume2, Heart, Youtube, Clock, X, ListMusic, ExternalLink } from 'lucide-react'
import { PageHeader } from '../shared'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Track = { id: string; title: string; artist: string; type: 'youtube' | 'spotify'; url: string }

const DEFAULT_TRACKS: Track[] = [
  { id: '1', title: 'Lo-Fi Beats', artist: 'Lofi Girl', type: 'youtube', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk' },
  { id: '2', title: 'Jazz Vibes', artist: 'Cafe Music BGM', type: 'youtube', url: 'https://www.youtube.com/watch?v=Dx5qFachdM8' },
]

export function MusicPlayer() {
  const [tracks, setTracks] = useState<Track[]>(DEFAULT_TRACKS)
  const [history, setHistory] = useState<Track[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [ytUrl, setYtUrl] = useState('')
  const [spotifyUrl, setSpotifyUrl] = useState('')
  const [tab, setTab] = useState('playlist')

  const current = tracks[currentIdx]

  const toggleLike = (id: string) => setLiked(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const playTrack = (idx: number) => { setCurrentIdx(idx); setPlaying(true); if (tracks[idx]) setHistory(p => [tracks[idx], ...p.filter(t => t.id !== tracks[idx].id).slice(0, 49)]) }
  const removeTrack = (idx: number) => { setTracks(p => p.filter((_, i) => i !== idx)); if (idx === currentIdx) { setPlaying(false); setCurrentIdx(0) } }

  const addYtTrack = () => {
    if (!ytUrl.includes('youtube.com/watch') && !ytUrl.includes('youtu.be')) return
    const id = `yt-${Date.now()}`
    const track: Track = { id, title: 'YouTube Track', artist: 'YouTube', type: 'youtube', url: ytUrl }
    setTracks(p => [...p, track]); setYtUrl('')
  }

  const addSpotifyTrack = () => {
    if (!spotifyUrl.includes('spotify.com')) return
    const id = `sp-${Date.now()}`
    const track: Track = { id, title: 'Spotify Track', artist: 'Spotify', type: 'spotify', url: spotifyUrl }
    setTracks(p => [...p, track]); setSpotifyUrl('')
  }

  const getYtEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
    return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1` : url
  }

  const getSpotifyEmbedUrl = (url: string) => {
    const match = url.match(/spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/)
    return match ? `https://open.spotify.com/embed/${match[1]}/${match[2]}` : url
  }

  return (
    <div>
      <PageHeader eyebrow="Music" title="EKVAAR Sound" description="Stream YouTube & Spotify directly." />
      <div className="px-4 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <div className="aspect-video rounded-lg bg-muted/30 mb-4 overflow-hidden flex items-center justify-center">
              {current ? (
                current.type === 'youtube' ? (
                  <iframe key={current.id + playing} src={playing ? getYtEmbedUrl(current.url) : ''} className="w-full h-full" allow="autoplay; encrypted-media" allowFullScreen />
                ) : (
                  <iframe key={current.id} src={getSpotifyEmbedUrl(current.url)} className="w-full h-full" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" />
                )
              ) : (
                <div className="text-center p-4">
                  <Youtube className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Select a track</p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between mb-4">
              <div className="min-w-0"><div className="font-medium truncate">{current?.title || 'No track'}</div><div className="text-xs text-muted-foreground">{current?.artist}</div></div>
              {current && <button onClick={() => toggleLike(current.id)}><Heart className={`h-5 w-5 ${liked.has(current.id) ? 'fill-agni text-agni' : 'text-muted-foreground'}`} /></button>}
            </div>
            <div className="flex items-center justify-center gap-4 mb-4">
              <Button variant="ghost" size="icon" onClick={() => playTrack((currentIdx - 1 + tracks.length) % tracks.length)}><SkipBack className="h-5 w-5" fill="currentColor" /></Button>
              <Button size="icon" className="h-12 w-12 rounded-full" onClick={() => setPlaying(p => !p)}>{playing ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5 ml-0.5" fill="currentColor" />}</Button>
              <Button variant="ghost" size="icon" onClick={() => playTrack((currentIdx + 1) % tracks.length)}><SkipForward className="h-5 w-5" fill="currentColor" /></Button>
            </div>
            <div className="text-xs text-center text-muted-foreground">
              {current?.type === 'spotify' && <a href={current.url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center justify-center gap-1"><ExternalLink className="h-3 w-3" /> Open in Spotify</a>}
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
                    <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 bg-muted">{t.type === 'youtube' ? <Youtube className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</div>
                    <div className="flex-1 min-w-0"><div className="text-sm truncate">{t.title}</div><div className="text-xs text-muted-foreground">{t.artist}</div></div>
                    <button onClick={e => { e.stopPropagation(); toggleLike(t.id) }}><Heart className={`h-4 w-4 ${liked.has(t.id) ? 'fill-agni text-agni' : 'text-muted-foreground/40'}`} /></button>
                    <button onClick={e => { e.stopPropagation(); removeTrack(i) }}><X className="h-4 w-4 text-muted-foreground hover:text-agni" /></button>
                  </div>
                ))}</div>
              </TabsContent>
              <TabsContent value="add" className="m-0 p-6 space-y-4">
                <div className="space-y-2"><label className="text-sm font-medium">YouTube URL</label><div className="flex gap-2"><input type="text" placeholder="https://youtube.com/watch?v=..." value={ytUrl} onChange={e => setYtUrl(e.target.value)} className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-transparent" /><button onClick={addYtTrack} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90">Add</button></div></div>
                <div className="space-y-2"><label className="text-sm font-medium">Spotify URL</label><div className="flex gap-2"><input type="text" placeholder="https://open.spotify.com/track/..." value={spotifyUrl} onChange={e => setSpotifyUrl(e.target.value)} className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-transparent" /><button onClick={addSpotifyTrack} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90">Add</button></div></div>
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
