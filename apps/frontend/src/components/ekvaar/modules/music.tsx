'use client'

import { useState } from 'react'
import { Search, Heart, Youtube, Clock, X, ListMusic, Play, ExternalLink } from 'lucide-react'
import { PageHeader } from '../shared'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Track = { id: string; title: string; artist: string; videoId: string; thumbnail?: string }

const DEFAULT_TRACKS: Track[] = [
  { id: '1', title: 'Lo-Fi Hip Hop Radio', artist: 'Lofi Girl', videoId: 'jfKfPfyJRdk', thumbnail: 'https://img.youtube.com/vi/jfKfPfyJRdk/hqdefault.jpg' },
  { id: '2', title: 'Jazz Relaxing Music', artist: 'Cafe Music BGM', videoId: 'Dx5qFachdM8', thumbnail: 'https://img.youtube.com/vi/Dx5qFachdM8/hqdefault.jpg' },
]

export function MusicPlayer() {
  const [tracks, setTracks] = useState<Track[]>(DEFAULT_TRACKS)
  const [history, setHistory] = useState<Track[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [tab, setTab] = useState('playlist')

  const current = tracks[currentIdx]

  const toggleLike = (id: string) => setLiked(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  
  const playTrack = (idx: number) => {
    setCurrentIdx(idx)
    if (tracks[idx]) setHistory(p => [tracks[idx], ...p.filter(t => t.id !== tracks[idx].id).slice(0, 49)])
  }
  
  const addAndPlay = (videoId: string, title: string, artist: string) => {
    const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    const existing = tracks.find(t => t.videoId === videoId)
    if (existing) {
      playTrack(tracks.indexOf(existing))
      return
    }
    const track: Track = { id: videoId, title, artist, videoId, thumbnail }
    setTracks(p => [...p, track])
    playTrack(tracks.length)
  }
  
  const removeTrack = (idx: number) => {
    setTracks(p => p.filter((_, i) => i !== idx))
    if (idx === currentIdx) setCurrentIdx(0)
  }

  const embedUrl = current ? `https://www.youtube.com/embed/${current.videoId}?autoplay=1&controls=1&modestbranding=1` : ''

  const handleAddManual = () => {
    const match = searchQuery.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/)
    if (match) {
      addAndPlay(match[1], 'YouTube Track', 'YouTube')
      setSearchQuery('')
    }
  }

  const openYouTubeSearch = () => {
    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`, '_blank')
  }

  return (
    <div>
      <PageHeader eyebrow="Music" title="EKVAAR Sound" description="Search YouTube and build your playlist." />
      <div className="px-4 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <div className="aspect-video rounded-lg bg-black mb-4 overflow-hidden">
              {current ? (
                <iframe
                  key={current.id}
                  src={embedUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Youtube className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate text-lg">{current?.title || 'Select a track'}</div>
                <div className="text-sm text-muted-foreground">{current?.artist}</div>
              </div>
              {current && (
                <div className="flex items-center gap-2 ml-4">
                  <a href={`https://youtube.com/watch?v=${current.videoId}`} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-muted rounded-full"><ExternalLink className="h-4 w-4" /></a>
                  <button onClick={() => toggleLike(current.id)}><Heart className={`h-5 w-5 ${liked.has(current.id) ? 'fill-agni text-agni' : 'text-muted-foreground'}`} /></button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-1">
          <CardContent className="p-0">
            <Tabs value={tab} onValueChange={setTab} className="w-full">
              <div className="p-4 border-b border-border">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="playlist"><ListMusic className="h-4 w-4 mr-1" />Playlist</TabsTrigger>
                  <TabsTrigger value="search"><Search className="h-4 w-4 mr-1" />Add</TabsTrigger>
                  <TabsTrigger value="history"><Clock className="h-4 w-4 mr-1" />History</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="playlist" className="m-0">
                <div className="max-h-[450px] overflow-y-auto">
                  {tracks.map((t, i) => (
                    <div key={t.id} className={`flex items-center gap-3 p-3 border-b border-border/60 hover:bg-muted/40 cursor-pointer ${i === currentIdx ? 'bg-muted/60' : ''}`} onClick={() => playTrack(i)}>
                      <img src={t.thumbnail} alt="" className="w-12 h-12 rounded-md object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{t.title}</div><div className="text-xs text-muted-foreground truncate">{t.artist}</div></div>
                      <button onClick={e => { e.stopPropagation(); toggleLike(t.id) }}><Heart className={`h-4 w-4 ${liked.has(t.id) ? 'fill-agni text-agni' : 'text-muted-foreground/40'}`} /></button>
                      <button onClick={e => { e.stopPropagation(); removeTrack(i) }}><X className="h-4 w-4 text-muted-foreground hover:text-agni" /></button>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="search" className="m-0 p-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Paste YouTube URL</label>
                    <div className="flex gap-2">
                      <input type="text" placeholder="https://youtube.com/watch?v=..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 px-4 py-2 text-sm rounded-md border border-input bg-transparent" />
                      <button onClick={handleAddManual} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90">Add</button>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or search on YouTube</span></div>
                  </div>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Search for songs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 px-4 py-2 text-sm rounded-md border border-input bg-transparent" />
                    <button onClick={openYouTubeSearch} className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"><Youtube className="h-4 w-4 inline mr-1" />Open YouTube</button>
                  </div>
                  <p className="text-xs text-muted-foreground">Click a video on YouTube, copy the URL from address bar, paste above and click Add.</p>
                </div>
              </TabsContent>
              <TabsContent value="history" className="m-0">
                <div className="max-h-[450px] overflow-y-auto">
                  {history.length === 0 ? <div className="p-8 text-center text-muted-foreground text-sm">No history yet</div> : history.map(t => (
                    <div key={t.id + '-hist'} className="flex items-center gap-3 p-3 border-b border-border/60 hover:bg-muted/40 cursor-pointer" onClick={() => { const idx = tracks.findIndex(tr => tr.videoId === t.videoId); if (idx >= 0) playTrack(idx) }}>
                      <img src={t.thumbnail} alt="" className="w-12 h-12 rounded-md object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{t.title}</div><div className="text-xs text-muted-foreground truncate">{t.artist}</div></div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
