'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Volume2, VolumeX, Mic, MicOff, Send, Hand, Sparkles, RotateCcw, Cpu, Zap, Activity, Radio, ChevronRight } from 'lucide-react'
import { useWindowStore } from '@/lib/window-store'
import { APPS } from './app-registry'
import { toast } from './toast'
import { MessageScroller, Message, Bubble } from '@/components/ui/chat'
import type { FrameDebug, TrackerStatus, Pose } from '@/lib/hand-tracker'
import { PINCH_ON } from '@/lib/hand-tracker'

const POSE_LABEL: Record<Pose, string> = {
  pinch: 'SCROLL', fist: 'CLOSING WINDOW…', open: '', point: '', none: '',
}
const POSE_COLOR: Record<Pose, string> = {
  pinch: '#34C759', fist: '#FF3B30', open: '#5856D6', point: '#5856D6', none: '#5856D6',
}

type KrishnaState = 'idle' | 'listening' | 'thinking' | 'talking'
interface Msg { role: 'user' | 'krishna'; text: string; ts: number; id?: string }

// ─── Strip everything that isn't plain speakable English ────────────────────
function toSpeech(text: string): string {
  return text
    .replace(/<[^>]*>/g, ' ')                          // XML / SSML tags
    .replace(/^[\s\S]*?SPOKEN:\s*/im, '')              // everything before SPOKEN: label
    .replace(/\n?ACTION:\s*\{[\s\S]*\}/gi, '')         // ACTION block if it leaked through
    .replace(/```[\s\S]*?```/g, ' ')                   // fenced code blocks
    .replace(/`[^`]*`/g, ' ')                          // inline code
    .replace(/https?:\/\/\S+/g, ' ')                   // URLs
    .replace(/^\s*\d+\.\s+/gm, ' ')                    // numbered list markers
    .replace(/^\s*[-*•]\s+/gm, ' ')                    // bullet markers
    .replace(/[*_#`>\\|]/g, ' ')                       // markdown symbols
    .replace(/₹/g, 'rupees ')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function toSentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]*/g)?.map(s => s.trim()).filter(s => s.length > 1) || [text]
}

// ─── Pick the best available browser voice ───────────────────────────────────
function pickBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  // Priority: Microsoft Neural Online (Windows/Chrome/Edge) > Google > Apple > any en
  const priority = [
    'Microsoft Ryan Online (Natural) - English (United Kingdom)',
    'Microsoft Sonia Online (Natural) - English (United Kingdom)',
    'Microsoft Guy Online (Natural) - English (United States)',
    'Microsoft David Online (Natural) - English (United States)',
    'Microsoft Aria Online (Natural) - English (United States)',
    'Microsoft Mark Online (Natural) - English (United States)',
    'Microsoft Neerja Online (Natural) - English (India)',
    // offline fallbacks
    'Microsoft David Desktop - English (United States)',
    'Google UK English Male',
    'Daniel', 'Arthur', 'Aaron',
  ]
  for (const name of priority) {
    const v = voices.find(v => v.name === name)
    if (v) return v
  }
  return (
    voices.find(v => v.name.startsWith('Google') && v.lang.startsWith('en')) ||
    voices.find(v => v.lang.startsWith('en-GB')) ||
    voices.find(v => v.lang.startsWith('en-US')) ||
    voices.find(v => v.lang.startsWith('en')) ||
    voices[0] || null
  )
}

// ─── Global state bus (drives wallpaper orb) ────────────────────────────────
let gState: KrishnaState = 'idle'
const stateListeners: ((s: KrishnaState) => void)[] = []
function setGlobal(s: KrishnaState) { gState = s; stateListeners.forEach(f => f(s)) }

// ─── Chat history persistence — survives reload/close instead of resetting ──
const HISTORY_KEY = 'ekvaar_krishna_history_v2'
const HISTORY_LIMIT = 50

function loadHistory(): Msg[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.slice(-HISTORY_LIMIT) : []
  } catch { return [] }
}

function saveHistory(messages: Msg[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-HISTORY_LIMIT))) } catch {}
}

// ─── Krishna state hook — for the top-bar status icon ───────────────────────
export function useKrishnaState(): KrishnaState {
  const [state, setState] = useState<KrishnaState>('idle')
  useEffect(() => {
    const fn = (s: KrishnaState) => setState(s)
    stateListeners.push(fn)
    return () => {
      const i = stateListeners.indexOf(fn)
      if (i >= 0) stateListeners.splice(i, 1)
    }
  }, [])
  return state
}

const STATE_COLOR: Record<KrishnaState, string> = {
  idle: '#00F0FF', listening: '#FF007A', thinking: '#A855F7', talking: '#10B981',
}

// ─── 2050 Cybernetic Canvas Audio/Neural Visualizer ─────────────────────────────
function KrishnaVisualizerCanvas({ state, analyser }: { state: KrishnaState; analyser: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let animId: number
    let angle = 0
    const freqData = new Uint8Array(analyser ? analyser.frequencyBinCount : 32)

    const render = () => {
      const w = canvas.width
      const h = canvas.height
      const cx = w / 2
      const cy = h / 2
      ctx.clearRect(0, 0, w, h)

      let avgVolume = 0
      if (analyser) {
        analyser.getByteFrequencyData(freqData)
        avgVolume = freqData.reduce((a, b) => a + b, 0) / freqData.length
      }

      angle += 0.025

      if (state === 'idle') {
        // Holographic 2050 Core Reactor Orb
        ctx.save()
        ctx.translate(cx, cy)

        // Outer concentric orbital ring
        ctx.rotate(angle * 0.4)
        ctx.beginPath()
        ctx.arc(0, 0, 34, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([8, 12])
        ctx.stroke()

        // Counter-rotating telemetry ring
        ctx.rotate(-angle * 0.9)
        ctx.beginPath()
        ctx.arc(0, 0, 26, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)'
        ctx.setLineDash([4, 6])
        ctx.stroke()
        ctx.restore()

        // Core Quantum Radial Glow
        const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 22)
        grad.addColorStop(0, 'rgba(0, 240, 255, 0.95)')
        grad.addColorStop(0.5, 'rgba(168, 85, 247, 0.45)')
        grad.addColorStop(1, 'rgba(0, 240, 255, 0)')
        ctx.beginPath()
        ctx.arc(cx, cy, 18 + Math.sin(angle * 2) * 3, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      } else if (state === 'listening') {
        // Real-time Dynamic Audio Spectrum Sonar Ring
        const volFactor = Math.min(avgVolume / 50, 2.5)
        const radius = 22 + volFactor * 12

        // Outer expanding wave ring
        ctx.beginPath()
        ctx.arc(cx, cy, radius * 1.5, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(255, 0, 122, ${Math.max(0.1, 0.5 - volFactor * 0.15)})`
        ctx.lineWidth = 1
        ctx.stroke()

        // Radial equalizer frequency spikes
        const bars = 32
        for (let i = 0; i < bars; i++) {
          const rad = (i / bars) * Math.PI * 2 + angle
          const val = (freqData[i % freqData.length] || 15) / 255
          const len = 10 + val * 26 * (1 + volFactor)
          const x1 = cx + Math.cos(rad) * radius
          const y1 = cy + Math.sin(rad) * radius
          const x2 = cx + Math.cos(rad) * (radius + len)
          const y2 = cy + Math.sin(rad) * (radius + len)

          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.strokeStyle = i % 2 === 0 ? '#00F0FF' : '#FF007A'
          ctx.lineWidth = 2
          ctx.stroke()
        }

        ctx.beginPath()
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0, 240, 255, 0.85)'
        ctx.shadowColor = '#00F0FF'
        ctx.shadowBlur = 15
        ctx.fill()
        ctx.shadowBlur = 0
      } else if (state === 'thinking') {
        // Sci-Fi Neural Matrix Grid & Laser Orbitals
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(angle * 2.2)
        for (let i = 0; i < 4; i++) {
          ctx.rotate(Math.PI / 2)
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.lineTo(30, 0)
          ctx.strokeStyle = i % 2 === 0 ? 'rgba(0, 240, 255, 0.85)' : 'rgba(168, 85, 247, 0.85)'
          ctx.lineWidth = 2
          ctx.stroke()

          ctx.beginPath()
          ctx.arc(30, 0, 4, 0, Math.PI * 2)
          ctx.fillStyle = '#00F0FF'
          ctx.fill()
        }
        ctx.restore()

        // Central Quantum Core
        ctx.beginPath()
        ctx.arc(cx, cy, 14 + Math.cos(angle * 4) * 4, 0, Math.PI * 2)
        ctx.fillStyle = '#A855F7'
        ctx.shadowColor = '#A855F7'
        ctx.shadowBlur = 18
        ctx.fill()
        ctx.shadowBlur = 0
      } else if (state === 'talking') {
        // Multi-frequency undulating audio sine wave
        ctx.beginPath()
        ctx.moveTo(10, cy)
        for (let x = 10; x < w - 10; x += 4) {
          const sine = Math.sin((x * 0.05) + angle * 3) * 16 * (0.4 + Math.sin(x * 0.02))
          ctx.lineTo(x, cy + sine)
        }
        ctx.strokeStyle = '#10B981'
        ctx.lineWidth = 2.5
        ctx.shadowColor = '#10B981'
        ctx.shadowBlur = 14
        ctx.stroke()
        ctx.shadowBlur = 0

        // Secondary laser sine wave
        ctx.beginPath()
        ctx.moveTo(10, cy)
        for (let x = 10; x < w - 10; x += 4) {
          const sine = Math.cos((x * 0.04) - angle * 2) * 10
          ctx.lineTo(x, cy + sine)
        }
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      animId = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animId)
  }, [state, analyser])

  return (
    <div className="relative flex items-center justify-center py-1">
      <canvas ref={canvasRef} width={340} height={80} className="w-full max-w-[340px] h-[80px] rounded-lg" />
    </div>
  )
}

// Futuristic top bar status icon
export function KrishnaMenuBarIcon({ onClick }: { onClick: () => void }) {
  const state = useKrishnaState()
  const color = STATE_COLOR[state]
  return (
    <button
      title="Krishna AI 2050 Core"
      onClick={onClick}
      className="group relative p-1.5 rounded-md hover:bg-cyan-500/15 transition-all flex items-center justify-center"
    >
      <div className="relative flex items-center justify-center h-4 w-4">
        <motion.div
          className="absolute inset-0 rounded-full border border-cyan-400/40"
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}` }}
          animate={{
            scale: state === 'idle' ? [1, 1.2, 1] : state === 'talking' ? [1, 1.4, 1] : [1, 1.3, 1],
            opacity: state === 'idle' ? [0.75, 1, 0.75] : 1,
          }}
          transition={{ duration: state === 'idle' ? 2 : state === 'listening' ? 0.5 : 0.3, repeat: Infinity }}
        />
      </div>
    </button>
  )
}

// ─── Gesture control — opt-in pinch-to-activate via webcam ─────────────────
// Separate from the orb: camera only turns on when the user explicitly
// enables it here, and this is where status/debug live so they don't
// clutter the centered orb.
export function GestureControl({ onBackgroundPinch }: { onBackgroundPinch: () => void }) {
  const [enabled, setEnabled] = useState(false)
  const [debug, setDebug] = useState(false)
  const [frame, setFrame] = useState<FrameDebug | null>(null)
  const [trackerStatus, setTrackerStatus] = useState<TrackerStatus | null>(null)
  const [trackerError, setTrackerError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Draw landmarks on canvas each frame
  useEffect(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video || !frame) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(-1, 1)
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
    ctx.restore()
    if (!frame.handDetected) return
    frame.landmarks.forEach((lm) => {
      const x = (1 - lm.x) * canvas.width
      const y = lm.y * canvas.height
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fillStyle = frame.pinching ? '#34C759' : '#5856D6'
      ctx.fill()
    })
    const thumb = frame.landmarks[4]
    const index = frame.landmarks[8]
    if (thumb && index) {
      [thumb, index].forEach((lm) => {
        ctx.beginPath()
        ctx.arc((1 - lm.x) * canvas.width, lm.y * canvas.height, 7, 0, Math.PI * 2)
        ctx.fillStyle = '#FF9F0A'
        ctx.fill()
      })
    }
  }, [frame])

  // Tracker lifecycle — only runs while `enabled`. `cancelled` guards against
  // the effect's async import resolving after cleanup already ran (React
  // Strict Mode double-invokes effects in dev); without this guard a stray
  // tracker instance survives and fires clicks alongside the real one.
  useEffect(() => {
    if (!enabled) { setTrackerStatus(null); setTrackerError(null); setFrame(null); return }
    const video = videoRef.current
    if (!video) return
    let cancelled = false
    let tracker: { stop(): void; start(): Promise<void> } | undefined
    import('@/lib/hand-tracker')
      .then(({ OSGestureController }) => {
        if (cancelled) return
        tracker = new OSGestureController(
          video,
          setFrame,
          (s, detail) => { setTrackerStatus(s); if (detail) setTrackerError(detail) },
          onBackgroundPinch,
        )
        tracker.start()
      })
      .catch((e) => { if (!cancelled) { setTrackerStatus('error'); setTrackerError(String(e)) } })
    return () => { cancelled = true; tracker?.stop() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  return (
    <div
      className="fixed z-[8500] pointer-events-none"
      style={{ bottom: 24, right: 24, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}
    >
      <video
        ref={videoRef}
        playsInline muted
        width={320} height={240}
        style={{ position: 'fixed', top: 0, left: 0, width: 320, height: 240, opacity: 0, pointerEvents: 'none', zIndex: -1 }}
      />

      {/* Debug panel — camera feed + landmarks + ratio */}
      {debug && enabled && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-auto"
          style={{
            background: 'rgba(0,0,0,0.9)',
            border: '1px solid rgba(88,86,214,0.3)',
            borderRadius: 12, padding: 10,
            display: 'flex', flexDirection: 'column', gap: 8,
            width: 320,
          }}
        >
          <canvas ref={canvasRef} width={320} height={240}
            style={{ borderRadius: 8, width: '100%', display: 'block' }} />
          {frame && (
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.7)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>HAND</span>
                <span style={{ color: frame.handDetected ? '#34C759' : '#FF3B30' }}>
                  {frame.handDetected ? 'DETECTED' : 'NOT DETECTED'}
                </span>
              </div>
              {frame.handDetected && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>RATIO</span>
                    <span style={{ color: frame.ratio < PINCH_ON ? '#34C759' : frame.ratio < 0.4 ? '#FF9F0A' : 'rgba(255,255,255,0.8)' }}>
                      {frame.ratio.toFixed(3)}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>/ trigger at &lt;{PINCH_ON}</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      width: `${Math.min(frame.ratio * 150, 100)}%`,
                      background: frame.pinching ? '#34C759' : frame.ratio < PINCH_ON ? '#34C759' : '#5856D6',
                      transition: 'width 0.05s ease',
                    }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>POSE</span>
                    <span style={{ color: POSE_COLOR[frame.pose] }}>
                      {POSE_LABEL[frame.pose] || 'idle'}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
          <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
            PINCH = scroll · PINCH on desktop = open Krishna · FIST hold = close window
          </div>
        </motion.div>
      )}

      {/* Status pill — click to toggle debug panel */}
      {trackerStatus && (
        <motion.button
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setDebug(d => !d)}
          className="pointer-events-auto"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: trackerStatus === 'error' ? 'rgba(255,59,48,0.15)' : debug ? 'rgba(88,86,214,0.3)' : 'rgba(0,0,0,0.5)',
            border: `1px solid ${trackerStatus === 'error' ? 'rgba(255,59,48,0.5)' : debug ? 'rgba(88,86,214,0.6)' : 'rgba(52,199,89,0.35)'}`,
            borderRadius: 10, padding: '3px 10px',
            cursor: 'pointer', maxWidth: 320, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
          title={trackerError || undefined}
        >
          <motion.div
            style={{
              width: 5, height: 5, borderRadius: '50%',
              background: trackerStatus === 'ready' ? '#34C759' : trackerStatus === 'error' ? '#FF3B30' : '#FF9F0A',
            }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace', letterSpacing: '0.08em' }}>
            {trackerStatus === 'requesting-camera' && 'REQUESTING CAMERA…'}
            {trackerStatus === 'loading-model' && 'LOADING GESTURE MODEL…'}
            {trackerStatus === 'ready' && (debug ? 'HIDE DEBUG' : 'GESTURE ACTIVE')}
            {trackerStatus === 'error' && `CAMERA ERROR: ${trackerError || 'unknown'}`}
          </span>
        </motion.button>
      )}

      {/* Manual toggle — camera only turns on when clicked */}
      <button
        onClick={() => setEnabled(e => !e)}
        className="pointer-events-auto flex items-center justify-center transition-colors"
        title={enabled ? 'Disable hand gesture control' : 'Enable hand gesture control'}
        style={{
          width: 40, height: 40, borderRadius: '50%',
          background: enabled ? 'rgba(52,199,89,0.2)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${enabled ? 'rgba(52,199,89,0.5)' : 'rgba(255,255,255,0.12)'}`,
          color: enabled ? '#34C759' : 'rgba(255,255,255,0.5)',
        }}
      >
        <Hand className="h-4 w-4" />
      </button>
    </div>
  )
}

// ─── Main Krishna panel ─────────────────────────────────────────────────────
export function Jarvis({ trigger, hasOpenWindows }: { trigger?: number; hasOpenWindows?: boolean }) {
  const { open: openWindow, activeId, windows } = useWindowStore()
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [inputText, setInputText] = useState('')
  const [transcript, setTranscript] = useState('')
  const [muted, setMuted] = useState(false)
  const [listening, setListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [micSupported, setMicSupported] = useState(true)
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null)

  const recorderRef       = useRef<MediaRecorder | null>(null)
  const webSpeechRef      = useRef<any>(null)
  const webSpeechFinal    = useRef<string>('')
  const listeningRef      = useRef(false)
  const voiceSessionRef   = useRef(false)
  const sendRef           = useRef<(text: string) => void>(() => {})
  const scrollRef         = useRef<HTMLDivElement>(null)
  const messagesEndRef    = useRef<HTMLDivElement>(null)
  const bestVoiceRef      = useRef<SpeechSynthesisVoice | null>(null)
  const inputRef          = useRef<HTMLTextAreaElement>(null)
  const audioStopRef      = useRef<(() => void) | null>(null)
  const speakingRef       = useRef(false)
  const vuRef             = useRef<ReturnType<typeof setInterval> | null>(null)

  const activeWindowName = activeId ? APPS.find(a => a.id === activeId)?.name || activeId : null

  useEffect(() => { setMessages(loadHistory()) }, [])
  useEffect(() => { saveHistory(messages) }, [messages])

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const pick = () => {
      const vs = window.speechSynthesis.getVoices()
      if (vs.length) bestVoiceRef.current = pickBestVoice(vs)
    }
    pick()
    window.speechSynthesis.onvoiceschanged = pick
    return () => { if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null }
  }, [])

  useEffect(() => { setMicSupported(typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia) }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {}
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, transcript, isProcessing])

  useEffect(() => {
    if (trigger && trigger > 0) { if (expanded) closePanel(); else openPanel() }
  }, [trigger])

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Escape' && expanded) closePanel() }
    window.addEventListener('keydown', down, true)
    return () => window.removeEventListener('keydown', down, true)
  }, [expanded])

  const stopTTS = useCallback(() => {
    if (audioStopRef.current) { audioStopRef.current(); audioStopRef.current = null }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    speakingRef.current = false
  }, [])

  const stopListening = useCallback(() => {
    listeningRef.current = false
    setAnalyserNode(null)
    if (vuRef.current) { clearInterval(vuRef.current); vuRef.current = null }
    if (webSpeechRef.current) {
      try {
        webSpeechRef.current.onresult = null
        webSpeechRef.current.onerror = null
        webSpeechRef.current.onend = null
        webSpeechRef.current.stop()
        webSpeechRef.current.abort?.()
      } catch {}
      webSpeechRef.current = null
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop() } catch {}
    }
  }, [])

  const closePanel = useCallback(() => {
    setExpanded(false)
    voiceSessionRef.current = false
    stopTTS()
    stopListening()
    setGlobal('idle')
    setListening(false)
    setTranscript('')
    setAnalyserNode(null)
    if (vuRef.current) { clearInterval(vuRef.current); vuRef.current = null }
  }, [stopTTS, stopListening])

  const speakText = useCallback(async (text: string) => {
    if (muted) { setGlobal('idle'); return }
    stopTTS()
    stopListening()
    const clean = toSpeech(text)
    if (!clean) { setGlobal('idle'); return }
    setGlobal('talking')
    speakingRef.current = true
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const sentences = toSentences(clean)
      for (const sentence of sentences) {
        if (!speakingRef.current) break
        await new Promise<void>((resolve) => {
          const u = new SpeechSynthesisUtterance(sentence)
          u.voice = bestVoiceRef.current
          u.rate = 1.0
          u.pitch = 1.0
          u.volume = 1.0
          let done = false
          const finish = () => { if (!done) { done = true; audioStopRef.current = null; resolve() } }
          audioStopRef.current = () => { window.speechSynthesis.cancel(); finish() }
          u.onend = finish
          u.onerror = (e) => { console.error('[TTS Error]', e); finish() }
          setTimeout(finish, sentence.length * 100 + 3000)
          window.speechSynthesis.speak(u)
        })
        if (speakingRef.current && sentences.indexOf(sentence) < sentences.length - 1) {
          await new Promise(r => setTimeout(r, 200))
        }
      }
    }
    speakingRef.current = false
    setGlobal('idle')
    if (voiceSessionRef.current && !listeningRef.current && !speakingRef.current) {
      setTimeout(() => {
        if (voiceSessionRef.current && !listeningRef.current && !speakingRef.current && (!window.speechSynthesis || !window.speechSynthesis.speaking)) {
          startListening()
        }
      }, 500)
    }
  }, [muted, stopTTS, stopListening])

  const startListening = useCallback(async () => {
    if (typeof window === 'undefined' || listeningRef.current || speakingRef.current) return
    if (typeof window !== 'undefined' && window.speechSynthesis?.speaking) return
    stopTTS()
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
    } catch {
      toast.error('Microphone blocked', 'Allow mic access in browser settings')
      voiceSessionRef.current = false
      return
    }
    listeningRef.current = true
    voiceSessionRef.current = true
    webSpeechFinal.current = ''
    setListening(true)
    setTranscript('')
    setGlobal('listening')
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SR) {
      const rec = new SR()
      rec.continuous = true
      rec.interimResults = true
      rec.lang = 'en-IN'
      webSpeechRef.current = rec
      rec.onresult = (e: any) => {
        if (!listeningRef.current || speakingRef.current) return
        let interim = ''
        let final = ''
        for (let i = 0; i < e.results.length; i++) {
          const t = e.results[i][0].transcript
          if (e.results[i].isFinal) final += t
          else interim += t
        }
        if (final) webSpeechFinal.current = final.trim()
        setTranscript(final || interim || '…')
      }
      rec.onerror = () => {}
      rec.onend = () => {}
      try { rec.start() } catch {}
    }
    const audioCtx = new AudioContext()
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 512
    audioCtx.createMediaStreamSource(stream).connect(analyser)
    setAnalyserNode(analyser)
    const buf = new Uint8Array(analyser.frequencyBinCount)
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
      : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : ''
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : {})
    recorderRef.current = recorder
    const chunks: Blob[] = []
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
    recorder.onstop = async () => {
      if (webSpeechRef.current) {
        try {
          webSpeechRef.current.onresult = null
          webSpeechRef.current.onerror = null
          webSpeechRef.current.onend = null
          webSpeechRef.current.stop()
          webSpeechRef.current.abort?.()
        } catch {}
        webSpeechRef.current = null
      }
      stream.getTracks().forEach(t => t.stop())
      audioCtx.close().catch(() => {})
      setAnalyserNode(null)
      if (vuRef.current) { clearInterval(vuRef.current); vuRef.current = null }
      setListening(false)
      listeningRef.current = false
      const webSpeechText = webSpeechFinal.current.trim()
      webSpeechFinal.current = ''
      let finalText = webSpeechText
      if (!finalText && chunks.length) {
        try {
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
          const fd = new FormData()
          fd.append('audio', blob, 'audio.webm')
          const res = await fetch('/api/jarvis/stt', {
            method: 'POST', body: fd,
            signal: AbortSignal.timeout(6000),
          })
          if (res.ok) {
            const { transcript: t } = await res.json()
            if (t?.trim()) finalText = t.trim()
          }
        } catch {}
      }
      setTranscript('')
      if (finalText) {
        sendRef.current(finalText)
        return
      }
      setGlobal('idle')
      if (voiceSessionRef.current && !listeningRef.current && !speakingRef.current) {
        setTimeout(() => {
          if (voiceSessionRef.current && !listeningRef.current && !speakingRef.current && (!window.speechSynthesis || !window.speechSynthesis.speaking)) {
            startListening()
          }
        }, 300)
      }
    }
    recorder.start(250)
    let lastSoundAt = Date.now()
    const startedAt = Date.now()
    vuRef.current = setInterval(() => {
      if (!listeningRef.current) { clearInterval(vuRef.current!); vuRef.current = null; return }
      analyser.getByteFrequencyData(buf)
      const avg = buf.reduce((a, b) => a + b, 0) / buf.length
      if (avg > 10) lastSoundAt = Date.now()
      const silentFor = Date.now() - lastSoundAt
      const recordedFor = Date.now() - startedAt
      if (silentFor > 2000 && recordedFor > 700) {
        clearInterval(vuRef.current!); vuRef.current = null
        if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop()
      }
    }, 80)
  }, [stopTTS])

  const toggleListening = useCallback(() => {
    if (listeningRef.current) {
      voiceSessionRef.current = false
      stopListening()
      setListening(false)
      setGlobal('idle')
      setTranscript('')
    } else {
      stopTTS()
      startListening()
    }
  }, [startListening, stopListening, stopTTS])

  const sendToKrishna = useCallback(async (text: string) => {
    if (!text.trim() || isProcessing) return
    setIsProcessing(true)
    setMessages(prev => [...prev, { role: 'user', text, ts: Date.now() }])
    setInputText('')
    setGlobal('thinking')
    try {
      const res = await fetch('/api/jarvis/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context: `Active: ${activeWindowName || 'none'}. Windows open: ${windows.length}.`,
          activeWindow: activeWindowName,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'API error')
      const reply = data.spoken || "I'm here."
      setMessages(prev => [...prev, { role: 'krishna', text: reply, ts: Date.now() }])
      setIsProcessing(false)
      if (data.action?.type === 'open_app') {
        const app = APPS.find(a =>
          a.id === data.action.app ||
          a.name.toLowerCase().includes((data.action.app || '').toLowerCase()) ||
          a.shortName.toLowerCase().includes((data.action.app || '').toLowerCase())
        )
        if (app) openWindow(app.id, app.name)
      } else if (data.action?.type === 'close_window') {
        const active = useWindowStore.getState().activeId
        if (active) useWindowStore.getState().close(active)
      }
      await speakText(reply)
    } catch (e: any) {
      const fallback = e?.message && e.message !== 'API error'
        ? `Krishna hit an error: ${e.message}`
        : "Krishna couldn't reach the server. Check your connection and try again."
      setMessages(prev => [...prev, { role: 'krishna', text: fallback, ts: Date.now() }])
      setIsProcessing(false)
      await speakText(fallback)
    } finally {
      setIsProcessing(false)
    }
  }, [activeWindowName, windows, isProcessing, openWindow, speakText])

  useEffect(() => { sendRef.current = sendToKrishna }, [sendToKrishna])

  const openPanel = useCallback(() => {
    setExpanded(true)
    voiceSessionRef.current = true
    setMessages(m => {
      if (m.length > 0) return m
      const h = parseInt(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }))
      const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good night'
      const greets = [`${g}. Online and ready.`, `${g}. How can I help?`, `${g}. What do you need?`]
      const msg = greets[Math.floor(Math.random() * greets.length)]
      return [...m, { role: 'krishna', text: msg, ts: Date.now(), id: Date.now().toString() }]
    })
    setTimeout(() => {
      const scroller = scrollRef.current
      if (scroller) scroller.scrollTop = scroller.scrollHeight
      if (voiceSessionRef.current && !listeningRef.current) startListening()
    }, 100)
  }, [startListening])

  const handleTextSend = () => {
    const text = inputText.trim()
    if (!text) return
    sendToKrishna(text)
  }

  const QUICK_COMMANDS = [
    { label: '⚡ System Status', prompt: 'Give me a system status summary.' },
    { label: '📈 Brand Health', prompt: 'What is our current brand health score?' },
    { label: '💰 Revenue Read', prompt: 'Show revenue and sales orders.' },
    { label: '🤖 Digital Employees', prompt: 'Who are our active digital employees?' },
  ]

  return (
    <AnimatePresence>
      {expanded && (
        <motion.section
          initial={{ opacity: 0, y: 25, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 25, scale: 0.95 }}
          transition={{ type: 'spring', damping: 24, stiffness: 320 }}
          className="fixed bottom-20 right-4 z-[9900] w-[min(calc(100vw-2rem),540px)] overflow-hidden rounded-2xl border border-cyan-500/35 bg-[#020814]/94 text-cyan-50 shadow-[0_0_60px_rgba(0,240,255,0.25),inset_0_0_20px_rgba(0,240,255,0.05)] backdrop-blur-2xl sm:right-6"
          aria-label="Krishna Cybernetic HUD 2050"
        >
          <span className="absolute top-1.5 left-2 font-mono text-[9px] text-cyan-400/40 select-none pointer-events-none">◤</span>
          <span className="absolute top-1.5 right-2 font-mono text-[9px] text-cyan-400/40 select-none pointer-events-none">◥</span>
          <span className="absolute bottom-1.5 left-2 font-mono text-[9px] text-cyan-400/40 select-none pointer-events-none">◣</span>
          <span className="absolute bottom-1.5 right-2 font-mono text-[9px] text-cyan-400/40 select-none pointer-events-none">◢</span>

          <header className="flex items-center justify-between border-b border-cyan-500/20 bg-cyan-950/30 px-4 py-2.5">
            <div className="flex items-center gap-2.5 font-mono text-[10px] tracking-[0.2em] text-cyan-300">
              <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${
                  gState === 'listening' ? 'bg-pink-500' : gState === 'talking' ? 'bg-emerald-400' : gState === 'thinking' ? 'bg-purple-400' : 'bg-cyan-400'
                }`} />
                <span className={`relative inline-flex h-2 w-2 rounded-full ${
                  gState === 'listening' ? 'bg-pink-500' : gState === 'talking' ? 'bg-emerald-400' : gState === 'thinking' ? 'bg-purple-400' : 'bg-cyan-400'
                }`} />
              </span>
              <span>KRISHNA // HUD 2050</span>
              {activeWindowName && (
                <span className="hidden text-cyan-400/50 sm:inline">
                  [ {activeWindowName.toUpperCase()} ]
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setMessages([])} className="rounded p-1.5 text-cyan-400/60 hover:bg-cyan-500/15 hover:text-cyan-200" title="Clear HUD stream">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setMuted(m => !m)} className="rounded p-1.5 text-cyan-400/60 hover:bg-cyan-500/15 hover:text-cyan-200" title={muted ? 'Unmute Krishna' : 'Mute Krishna'}>
                {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </button>
              <button onClick={closePanel} className="rounded p-1.5 text-cyan-400/60 hover:bg-red-500/20 hover:text-red-300" title="Close HUD">
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="relative border-b border-cyan-500/15 bg-gradient-to-b from-cyan-950/25 to-transparent px-4 py-1">
            <div className="flex items-center justify-between font-mono text-[9px] tracking-widest text-cyan-400/60">
              <span className="flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-cyan-400" /> NEURAL FREQUENCY SPECTRUM</span>
              <span className="uppercase text-cyan-300 font-semibold">{gState} MODE</span>
            </div>
            <KrishnaVisualizerCanvas state={gState} analyser={analyserNode} />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-cyan-500/15 px-3 py-2 no-scrollbar">
            {QUICK_COMMANDS.map((cmd) => (
              <button
                key={cmd.label}
                onClick={() => sendToKrishna(cmd.prompt)}
                disabled={isProcessing}
                className="shrink-0 rounded-full border border-cyan-500/25 bg-cyan-950/40 px-2.5 py-1 font-mono text-[10px] text-cyan-200 hover:border-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-50 transition-all disabled:opacity-40"
              >
                {cmd.label}
              </button>
            ))}
          </div>

          <aside className="flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-cyan-500/15 px-4 py-1.5 font-mono text-[9px] tracking-[0.18em] text-cyan-400/60">
              <span>HOLOGRAPHIC STREAM</span>
              <span>{messages.length ? `${messages.length} TELEMETRY NODES` : 'SYSTEM STANDBY'}</span>
            </div>
            <MessageScroller ref={scrollRef} className="max-h-44 min-h-20 px-4 py-3 sm:max-h-48">
              {messages.slice(-4).map((m, i) => (
                <Message key={`${m.ts}-${i}`} isKrishna={m.role === 'krishna'} className="mb-2">
                  <Bubble
                    isKrishna={m.role === 'krishna'}
                    className="max-w-[88%] text-[11px] font-sans leading-relaxed"
                    style={m.role === 'krishna'
                      ? { background: 'rgba(0,240,255,0.08)', border: '1px solid rgba(0,240,255,0.25)', color: '#E0F7FA', boxShadow: '0 0 15px rgba(0,240,255,0.1)' }
                      : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFFFFF' }}
                  >
                    {m.role === 'krishna' && (
                      <div className="mb-1 flex items-center gap-1.5 font-mono text-[9px] font-semibold text-cyan-300">
                        <Cpu className="h-3 w-3 text-cyan-400" />
                        <span>KRISHNA AI</span>
                      </div>
                    )}
                    {m.text}
                  </Bubble>
                </Message>
              ))}
              {listening && transcript && (
                <div className="my-1.5 flex items-center justify-end gap-2 px-2 py-1 font-mono text-xs text-pink-300 italic">
                  <Radio className="h-3 w-3 animate-pulse text-pink-400" />
                  <span>{transcript}</span>
                </div>
              )}
              {isProcessing && (
                <div className="my-1.5 flex items-center gap-2 px-2 py-1 font-mono text-[10px] tracking-widest text-cyan-300">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                  <span>NEURAL PROCESSING IN PROGRESS...</span>
                </div>
              )}
              {!messages.length && !transcript && (
                <p className="px-2 py-3 text-center font-mono text-[10px] tracking-widest text-cyan-400/40">
                  SPEAK OR TYPE A COMMAND TO ENGAGE KRISHNA AI 2050
                </p>
              )}
              <div ref={messagesEndRef} />
            </MessageScroller>

            <div className="flex items-center gap-3 border-t border-cyan-500/20 bg-cyan-950/30 p-3">
              <button
                onClick={toggleListening}
                disabled={isProcessing && !speakingRef.current}
                className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full border transition-all duration-300 ${
                  listening
                    ? 'border-pink-500 bg-pink-500/25 text-pink-200 shadow-[0_0_25px_rgba(255,0,122,0.6)]'
                    : speakingRef.current
                    ? 'border-emerald-400 bg-emerald-500/25 text-emerald-200 shadow-[0_0_25px_rgba(16,185,129,0.6)]'
                    : 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200 hover:border-cyan-300 hover:bg-cyan-500/20 shadow-[0_0_15px_rgba(0,240,255,0.25)]'
                }`}
                title={listening ? 'Deactivate mic' : 'Activate mic'}
              >
                {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <textarea
                ref={inputRef}
                rows={1}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSend() } }}
                className="h-10 min-w-0 flex-1 resize-none rounded-lg border border-cyan-500/20 bg-black/40 px-3 py-2.5 font-mono text-xs text-cyan-50 outline-none placeholder:text-cyan-400/35 focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40"
                placeholder={isProcessing ? 'COMPUTING REASONING...' : 'Enter a command for Krishna AI...'}
              />
              <button
                onClick={handleTextSend}
                disabled={!inputText.trim() || isProcessing}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-cyan-400/40 bg-cyan-500/20 text-cyan-100 hover:border-cyan-300 hover:bg-cyan-500/35 hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all disabled:opacity-35"
                title="Send command"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin text-cyan-300" /> : <Send className="h-4 w-4 text-cyan-200" />}
              </button>
            </div>
          </aside>

        </motion.section>
      )}
    </AnimatePresence>
  )
}
