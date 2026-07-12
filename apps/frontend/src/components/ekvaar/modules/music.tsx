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
  const [searchResults, setSearchResults] = useState<Track[]>([])
  const [searching, setSearching] = useState(false)
  const [tab, setTab] = useState('playlist')

  const current = tracks[currentIdx]

  const toggleLike = (id: string) => setLiked(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  
  const playTrack = (idx: number) => {
    setCurrentIdx(idx)
    if (tracks[idx]) setHistory(p => [tracks[idx], ...p.filter(t => t.id !== tracks[idx].id).slice(0, 49)])
  }
  
  const addToPlaylist = (track: Track) => {
    if (!tracks.find(t => t.videoId === track.videoId)) {
      setTracks(p => [...p, track])
    }
    playTrack(tracks.length)
  }
  
  const removeTrack = (idx: number) => {
    setTracks(p => p.filter((_, i) => i !== idx))
    if (idx === currentIdx) setCurrentIdx(0)
  }

  const searchYouTube = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=10&key=AIzaSyAOygJ5VyR3pDaXIqPzSlN4v5BUh7iNLho`)
      const data = await res.json()
      if (data.items) {
        setSearchResults(data.items.map((item: any) => ({
          id: item.id.videoId,
          title: item.snippet.title,
          artist: item.snippet.channelTitle,
          videoId: item.id.videoId,
          thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url
        })))
      }
    } catch (e) {
      console.error('YouTube search failed', e)
    }
    setSearching(false)
  }

  const embedUrl = current ? `https://www.youtube.com/embed/${current.videoId}?autoplay=1&controls=1&modestbranding=1` : ''

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
              <div className="min-w-0">
                <div className="font-medium truncate text-lg">{current?.title || 'Select a track'}</div>
                <div className="text-sm text-muted-foreground">{current?.artist}</div>
              </div>
              {current && (
                <div className="flex items-center gap-2">
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
                  <TabsTrigger value="search"><Search className="h-4 w-4 mr-1" />Search</TabsTrigger>
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
              <TabsContent value="search" className="m-0 p-4">
                <div className="flex gap-2 mb-4">
                  <input type="text" placeholder="Search YouTube..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchYouTube()} className="flex-1 px-4 py-2 text-sm rounded-md border border-input bg-transparent" />
                  <button onClick={searchYouTube} disabled={searching} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"><Search className="h-4 w-4" /></button>
                </div>
                <div className="max-h-[350px] overflow-y-auto">
                  {searching ? <div className="p-8 text-center text-muted-foreground">Searching...</div> : searchResults.map(t => (
                    <div key={t.id} className="flex items-center gap-3 p-3 border-b border-border/60 hover:bg-muted/40 cursor-pointer" onClick={() => addToPlaylist(t)}>
                      <img src={t.thumbnail} alt="" className="w-12 h-12 rounded-md object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{t.title}</div><div className="text-xs text-muted-foreground truncate">{t.artist}</div></div>
                      <Play className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                  {!searching && searchResults.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">Search for songs on YouTube</div>}
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
