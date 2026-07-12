import { create } from 'zustand'

export type Track = {
  id: string
  title: string
  artist: string
  spotifyUri?: string
  thumbnail?: string
}

interface MusicState {
  tracks: Track[]
  currentIdx: number
  playing: boolean
  volume: number
  minimized: boolean
  position: { x: number; y: number }
  isOpen: boolean
  setTracks: (tracks: Track[]) => void
  addTrack: (track: Track) => void
  playTrack: (idx: number) => void
  next: () => void
  prev: () => void
  togglePlay: () => void
  setVolume: (v: number) => void
  toggleMinimize: () => void
  move: (pos: { x: number; y: number }) => void
  close: () => void
  open: () => void
}

export const useMusicStore = create<MusicState>((set, get) => ({
  tracks: [],
  currentIdx: 0,
  playing: false,
  volume: 80,
  minimized: false,
  position: { x: 20, y: 80 },
  isOpen: false,
  setTracks: (tracks) => set({ tracks }),
  addTrack: (track) => set((s) => ({ tracks: [...s.tracks, track] })),
  playTrack: (idx) => set({ currentIdx: idx, playing: true, isOpen: true }),
  next: () => set((s) => ({ currentIdx: (s.currentIdx + 1) % Math.max(s.tracks.length, 1) })),
  prev: () => set((s) => ({ currentIdx: (s.currentIdx - 1 + Math.max(s.tracks.length, 1)) % Math.max(s.tracks.length, 1) })),
  togglePlay: () => set((s) => ({ playing: !s.playing })),
  setVolume: (v) => set({ volume: v }),
  toggleMinimize: () => set((s) => ({ minimized: !s.minimized })),
  move: (pos) => set({ position: pos }),
  close: () => set({ playing: false, isOpen: false }),
  open: () => set({ isOpen: true, minimized: false }),
}))
