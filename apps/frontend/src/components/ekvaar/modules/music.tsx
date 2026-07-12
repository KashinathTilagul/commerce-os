'use client'

import { useState } from 'react'
import { useMusicStore } from '@/lib/music-store'
import { PageHeader } from '../shared'
import { Card, CardContent } from '@/components/ui/card'

export function MusicPlayer() {
  const { tracks, currentIdx, history, liked, addTrack, playTrack, toggleLike, toggleMinimize, stop } = useMusicStore()
  const [searchQuery, setSearchQuery] = useState('')

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

  return (
    <div>
      <PageHeader eyebrow="Music" title="EKVAAR Sound" description="YouTube music player. Mini player at top-left." />
      <div className="px-4 lg:px-8 py-6">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Add YouTube Track</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://youtube.com/watch?v=..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="flex-1 px-4 py-2 text-sm rounded-md border border-input bg-transparent"
                  />
                  <button onClick={handleAddManual} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                    Add
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Playlist ({tracks.length})</h3>
                <div className="space-y-1">
                  {tracks.map((t, i) => (
                    <div
                      key={t.id}
                      onClick={() => playTrack(i)}
                      className={`flex items-center gap-3 p-2 rounded cursor-pointer ${i === currentIdx ? 'bg-muted' : 'hover:bg-muted/50'}`}
                    >
                      <img src={t.thumbnail} alt="" className="w-12 h-12 rounded object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{t.title}</div>
                        <div className="text-xs text-muted-foreground">{t.artist}</div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); toggleLike(t.id) }} className="p-1">
                        <Heart className={`h-4 w-4 ${liked.has(t.id) ? 'fill-agni text-agni' : 'text-muted-foreground'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {history.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Recently Played</h3>
                  <div className="space-y-1">
                    {history.slice(0, 5).map(t => (
                      <div
                        key={t.id + '-hist'}
                        onClick={() => { const idx = tracks.findIndex(tr => tr.videoId === t.videoId); if (idx >= 0) playTrack(idx) }}
                        className="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted/50"
                      >
                        <img src={t.thumbnail} alt="" className="w-8 h-8 rounded object-cover" />
                        <span className="text-xs truncate">{t.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
