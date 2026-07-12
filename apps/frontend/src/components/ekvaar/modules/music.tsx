'use client'

import { useState } from 'react'
import { Search, Heart, Youtube, Clock, X, ListMusic, ExternalLink } from 'lucide-react'
import { PageHeader } from '../shared'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMusicStore } from '@/lib/music-store'

export function MusicPlayer() {
  const { tracks, currentIdx, history, liked, playing, addTrack, removeTrack, playTrack, toggleLike, togglePlay, next, prev } = useMusicStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [tab, setTab] = useState('playlist')

  const current = tracks[currentIdx]

  const handleAddManual = () => {
    const match = searchQuery.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/)
    if (match) {
      const videoId = match[1]
      const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      addTrack({ id: videoId, title: 'YouTube Track', artist: 'YouTube', videoId, thumbnail })
      playTrack(tracks.length)
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
            <div className="aspect-video rounded-lg bg-black mb-4 overflow-hidden flex items-center justify-center relative">
              {current ? (
                <>
                  <img src={current.thumbnail} alt="" className="w-full h-full object-cover absolute inset-0" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <button onClick={togglePlay} className="h-16 w-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition">
                      {playing ? <span className="text-white text-2xl">❚❚</span> : <span className="text-white text-2xl ml-1">▶</span>}
                    </button>
                  </div>
                </>
              ) : (
                <Youtube className="h-16 w-16 text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center justify-between mb-4">
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
            <div className="flex items-center justify-center gap-4">
              <button onClick={prev} className="p-2 hover:bg-muted rounded-full"><span className="text-xl">⏮</span></button>
              <button onClick={togglePlay} className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center">{playing ? <span className="text-xl">❚❚</span> : <span className="text-xl ml-1">▶</span>}</button>
              <button onClick={next} className="p-2 hover:bg-muted rounded-full"><span className="text-xl">⏭</span></button>
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
