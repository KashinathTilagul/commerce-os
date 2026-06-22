'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, Heart } from 'lucide-react'
import { PageHeader } from '../shared'
import { Card, CardContent } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'

const TRACKS = [
  { title: 'Permanence', artist: 'EKVAAR Sound', album: 'All-Time Fashion', duration: 248, color: '#0A0A0A' },
  { title: 'Noor Black', artist: 'EKVAAR Sound', album: 'All-Time Fashion', duration: 192, color: '#1F3A5F' },
  { title: 'Agni Red', artist: 'EKVAAR Sound', album: 'All-Time Fashion', duration: 215, color: '#C8302A' },
  { title: 'Rui White', artist: 'EKVAAR Sound', album: 'All-Time Fashion', duration: 178, color: '#D4859B' },
  { title: 'Arav Green', artist: 'EKVAAR Sound', album: 'All-Time Fashion', duration: 234, color: '#2F4F3A' },
  { title: 'Gulabi Pink', artist: 'EKVAAR Sound', album: 'All-Time Fashion', duration: 201, color: '#D4859B' },
  { title: 'House of Originals', artist: 'EKVAAR Sound', album: 'All-Time Fashion', duration: 312, color: '#8B7355' },
  { title: 'Cultural Syntax', artist: 'EKVAAR Sound', album: 'All-Time Fashion', duration: 267, color: '#1F3A5F' },
]

export function MusicPlayer() {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [volume, setVolume] = useState([70])
  const [liked, setLiked] = useState<Set<number>>(new Set([0, 2, 4]))
  const [bars, setBars] = useState<number[]>(Array(48).fill(10))

  const current = TRACKS[currentIdx]

  // Web Audio API — generates ambient tones matching each track
  const audioCtxRef = useRef<AudioContext | null>(null)
  const oscRef = useRef<OscillatorNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const lfoRef = useRef<OscillatorNode | null>(null)

  // Frequency per track (mapped from color)
  const TRACK_FREQS = [220, 261.63, 293.66, 329.63, 392, 440, 174.61, 233.08]

  const startAudio = () => {
    if (typeof window === 'undefined') return
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    const ctx = audioCtxRef.current
    if (ctx.state === 'suspended') ctx.resume()

    // Stop existing
    stopAudio()

    // Main oscillator
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = TRACK_FREQS[currentIdx]

    // Gain (volume)
    const gain = ctx.createGain()
    gain.gain.value = 0
    gain.gain.linearRampToValueAtTime((volume[0] / 100) * 0.15, ctx.currentTime + 0.3)

    // LFO for subtle vibrato
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.5
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 3
    lfo.connect(lfoGain)
    lfoGain.connect(osc.frequency)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    lfo.start()

    oscRef.current = osc
    gainRef.current = gain
    lfoRef.current = lfo
  }

  const stopAudio = () => {
    if (gainRef.current && audioCtxRef.current) {
      gainRef.current.gain.linearRampToValueAtTime(0, audioCtxRef.current.currentTime + 0.2)
    }
    setTimeout(() => {
      try {
        oscRef.current?.stop()
        lfoRef.current?.stop()
      } catch {}
      oscRef.current = null
      lfoRef.current = null
    }, 250)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio()
      audioCtxRef.current?.close()
    }
  }, [])

  // Progress timer
  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= current.duration) {
          // Auto-advance
          setCurrentIdx((i) => (i + 1) % TRACKS.length)
          return 0
        }
        return p + 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [playing, current.duration])

  // Visualizer
  useEffect(() => {
    if (!playing) {
      const raf = requestAnimationFrame(() => setBars(Array(48).fill(10)))
      return () => cancelAnimationFrame(raf)
    }
    const t = setInterval(() => {
      setBars(Array.from({ length: 48 }, () => 10 + Math.floor(Math.random() * 80)))
    }, 100)
    return () => clearInterval(t)
  }, [playing])

  const togglePlay = () => {
    if (playing) {
      stopAudio()
      setPlaying(false)
    } else {
      startAudio()
      setPlaying(true)
    }
  }
  const next = () => {
    stopAudio()
    setCurrentIdx((i) => (i + 1) % TRACKS.length)
    setProgress(0)
    if (playing) setTimeout(() => startAudio(), 100)
  }
  const prev = () => {
    stopAudio()
    setCurrentIdx((i) => (i - 1 + TRACKS.length) % TRACKS.length)
    setProgress(0)
    if (playing) setTimeout(() => startAudio(), 100)
  }
  const selectTrack = (i: number) => {
    stopAudio()
    setCurrentIdx(i)
    setProgress(0)
    setPlaying(true)
    setTimeout(() => startAudio(), 100)
  }
  const toggleLike = (i: number) => {
    setLiked((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  return (
    <div>
      <PageHeader
        eyebrow="Music"
        title="EKVAAR Sound"
        description="All-Time Fashion — the soundtrack of the House. Built for permanence."
      />

      <div className="px-4 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Now playing */}
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            {/* Album art */}
            <div
              className="aspect-square rounded-lg mb-4 relative overflow-hidden grain"
              style={{
                background: `linear-gradient(135deg, ${current.color} 0%, ${current.color}aa 50%, ${current.color}66 100%)`,
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="font-display text-6xl tracking-tighter" style={{ color: '#F5F1EA', opacity: 0.9 }}>
                  EKVAAR
                </div>
              </div>
              {/* Color stripes */}
              <div className="absolute bottom-3 left-3 flex gap-1">
                <div className="h-0.5 w-4" style={{ background: '#C8302A' }} />
                <div className="h-0.5 w-4" style={{ background: '#1F3A5F' }} />
                <div className="h-0.5 w-4" style={{ background: '#2F4F3A' }} />
                <div className="h-0.5 w-4" style={{ background: '#D4859B' }} />
              </div>
            </div>

            {/* Track info */}
            <div className="flex items-start justify-between mb-4">
              <div className="min-w-0">
                <div className="font-display text-lg tracking-tight truncate">{current.title}</div>
                <div className="text-xs text-muted-foreground">{current.artist} · {current.album}</div>
              </div>
              <button onClick={() => toggleLike(currentIdx)} className="flex-shrink-0 ml-2">
                <Heart className={`h-5 w-5 ${liked.has(currentIdx) ? 'fill-agni text-agni' : 'text-muted-foreground'}`} />
              </button>
            </div>

            {/* Visualizer */}
            <div className="flex items-end justify-center gap-0.5 h-12 mb-4">
              {bars.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm transition-all duration-100"
                  style={{
                    height: `${h}%`,
                    background: playing ? current.color : '#48484A',
                    opacity: playing ? 0.8 : 0.3,
                  }}
                />
              ))}
            </div>

            {/* Progress */}
            <div className="mb-4">
              <Slider value={[progress]} onValueChange={(v) => setProgress(v)} max={current.duration} step={1} className="mb-2" />
              <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                <span>{fmtTime(progress)}</span>
                <span>{fmtTime(current.duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <Shuffle className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={prev}>
                <SkipBack className="h-5 w-5" fill="currentColor" />
              </Button>
              <Button
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={togglePlay}
                style={{ background: current.color, color: '#F5F1EA' }}
              >
                {playing ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5 ml-0.5" fill="currentColor" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={next}>
                <SkipForward className="h-5 w-5" fill="currentColor" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <Repeat className="h-4 w-4" />
              </Button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-2 mt-4">
              <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
              <Slider value={volume} onValueChange={setVolume} max={100} step={1} className="flex-1" />
              <span className="text-[10px] font-mono text-muted-foreground w-8">{volume[0]}</span>
            </div>
          </CardContent>
        </Card>

        {/* Playlist */}
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            <div className="p-4 border-b border-border">
              <div className="font-display text-base tracking-tight">All-Time Fashion</div>
              <div className="text-xs text-muted-foreground">{TRACKS.length} tracks · {Math.floor(TRACKS.reduce((s, t) => s + t.duration, 0) / 60)} min</div>
            </div>
            <div className="max-h-[480px] overflow-y-auto">
              {TRACKS.map((t, i) => (
                <div
                  key={i}
                  onClick={() => selectTrack(i)}
                  role="button"
                  tabIndex={0}
                  className={`w-full flex items-center gap-3 p-3 border-b border-border/60 last:border-0 hover:bg-muted/40 transition-colors text-left cursor-pointer ${
                    i === currentIdx ? 'bg-muted/60' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: `${t.color}30` }}>
                    {i === currentIdx && playing ? (
                      <div className="flex items-end gap-0.5 h-3">
                        <div className="w-0.5 bg-foreground animate-pulse" style={{ height: '60%' }} />
                        <div className="w-0.5 bg-foreground animate-pulse" style={{ height: '100%', animationDelay: '0.1s' }} />
                        <div className="w-0.5 bg-foreground animate-pulse" style={{ height: '40%', animationDelay: '0.2s' }} />
                      </div>
                    ) : (
                      <span className="text-[10px] font-mono text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm truncate ${i === currentIdx ? 'font-medium' : ''}`}>{t.title}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{t.artist}</div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleLike(i) }}
                    className="flex-shrink-0"
                  >
                    <Heart className={`h-3.5 w-3.5 ${liked.has(i) ? 'fill-agni text-agni' : 'text-muted-foreground/40'}`} />
                  </button>
                  <div className="text-[10px] font-mono text-muted-foreground flex-shrink-0">{fmtTime(t.duration)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
