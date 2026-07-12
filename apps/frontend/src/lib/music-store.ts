import { create } from 'zustand'

export type Track = { id: string; title: string; artist: string; videoId: string; thumbnail?: string }

interface MusicState {
  tracks: Track[]
  currentIdx: number
  history: Track[]
  liked: Set<string>
  playing: boolean
  volume: number
  minimized: boolean
  position: { x: number; y: number }
  isOpen: boolean
  addTrack: (track: Track) => void
  removeTrack: (idx: number) => void
  playTrack: (idx: number) => void
  next: () => void
  prev: () => void
  togglePlay: () => void
  setVolume: (v: number) => void
  toggleLike: (id: string) => void
  toggleMinimize: () => void
  move: (pos: { x: number; y: number }) => void
  close: () => void
  open: () => void
}

export const useMusicStore = create<MusicState>((set) => ({
  tracks: [],
  currentIdx: 0,
  history: [],
  liked: new Set(),
  playing: false,
  volume: 80,
  minimized: false,
  position: { x: 20, y: 80 },
  isOpen: false,
  addTrack: (track: Track) => set((s) => ({ tracks: [...s.tracks, track] })),
  removeTrack: (idx: number) => set((s) => ({ tracks: s.tracks.filter((_, i) => i !== idx), currentIdx: idx === s.currentIdx ? 0 : s.currentIdx })),
  playTrack: (idx: number) => set((s) => {
    const track = s.tracks[idx]
    if (!track) return {}
    const history = [track, ...s.history.filter((t) => t.id !== track.id)].slice(0, 50)
    return { currentIdx: idx, playing: true, history, isOpen: true }
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
  toggleMinimize: () => set((s) => ({ minimized: !s.minimized })),
  move: (pos) => set({ position: pos }),
  close: () => set({ playing: false, isOpen: false }),
  open: () => set({ isOpen: true, minimized: false }),
}))
