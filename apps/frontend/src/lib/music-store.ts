import { create } from 'zustand'

export type Track = { id: string; title: string; artist: string; videoId: string; thumbnail?: string }

interface MusicState {
  tracks: Track[]
  currentIdx: number
  history: Track[]
  liked: Set<string>
  playing: boolean
  volume: number
  addTrack: (track: Track) => void
  removeTrack: (idx: number) => void
  playTrack: (idx: number) => void
  next: () => void
  prev: () => void
  togglePlay: () => void
  setVolume: (v: number) => void
  toggleLike: (id: string) => void
  addToHistory: (track: Track) => void
}

const DEFAULT_TRACKS: Track[] = [
  { id: '1', title: 'Lo-Fi Hip Hop Radio', artist: 'Lofi Girl', videoId: 'jfKfPfyJRdk', thumbnail: 'https://img.youtube.com/vi/jfKfPfyJRdk/hqdefault.jpg' },
  { id: '2', title: 'Jazz Relaxing Music', artist: 'Cafe Music BGM', videoId: 'Dx5qFachdM8', thumbnail: 'https://img.youtube.com/vi/Dx5qFachdM8/hqdefault.jpg' },
]

export const useMusicStore = create<MusicState>((set) => ({
  tracks: DEFAULT_TRACKS,
  currentIdx: 0,
  history: [],
  liked: new Set(),
  playing: false,
  volume: 80,
  addTrack: (track: Track) => set((s) => ({ tracks: [...s.tracks, track] })),
  removeTrack: (idx: number) => set((s) => ({ tracks: s.tracks.filter((_, i) => i !== idx), currentIdx: idx === s.currentIdx ? 0 : s.currentIdx })),
  playTrack: (idx: number) => set((s) => {
    const track = s.tracks[idx]
    if (!track) return {}
    const history = [track, ...s.history.filter((t) => t.id !== track.id)].slice(0, 50)
    return { currentIdx: idx, playing: true, history }
  }),
  next: () => set((s) => ({ currentIdx: (s.currentIdx + 1) % s.tracks.length })),
  prev: () => set((s) => ({ currentIdx: (s.currentIdx - 1 + s.tracks.length) % s.tracks.length })),
  togglePlay: () => set((s) => ({ playing: !s.playing })),
  setVolume: (v: number) => set({ volume: v }),
  toggleLike: (id: string) => set((s) => {
    const n = new Set(s.liked)
    if (n.has(id)) { n.delete(id) } else { n.add(id) }
    return { liked: n }
  }),
  addToHistory: (track: Track) => set((s) => ({ history: [track, ...s.history.filter((t) => t.id !== track.id)].slice(0, 50) })),
}))
