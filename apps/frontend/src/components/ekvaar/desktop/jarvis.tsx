'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Volume2, VolumeX, Mic, MicOff, Send, Radio, Hand } from 'lucide-react'
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
interface Msg { role: 'user' | 'krishna'; text: string; ts: number }

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
const HISTORY_KEY = 'ekvaar_krishna_history'
const HISTORY_LIMIT = 200

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
  idle: '#5856D6', listening: '#FF3B30', thinking: '#0A84FF', talking: '#34C759',
}

// Small pulsing dot for the top menu bar — replaces the old floating 3D orb,
// which didn't read well shrunk to icon size. Click still opens Krishna.
export function KrishnaMenuBarIcon({ onClick }: { onClick: () => void }) {
  const state = useKrishnaState()
  const color = STATE_COLOR[state]
  return (
    <button
      title="Krishna AI"
      onClick={onClick}
      className="p-1 rounded hover:bg-white/15 transition-colors flex items-center justify-center"
    >
      <motion.div
        style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }}
        animate={{
          scale: state === 'idle' ? [1, 1.15, 1] : state === 'talking' ? [1, 1.35, 1] : [1, 1.25, 1],
          opacity: state === 'idle' ? [0.7, 1, 0.7] : 1,
        }}
        transition={{ duration: state === 'idle' ? 2.2 : state === 'listening' ? 0.6 : 0.4, repeat: Infinity }}
      />
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
  const [volume, setVolume] = useState(0) // 0-100 VU meter

  const recorderRef       = useRef<MediaRecorder | null>(null)
  const webSpeechRef      = useRef<any>(null)          // Web Speech API instance
  const webSpeechFinal    = useRef<string>('')         // latest Web Speech final transcript
  const listeningRef      = useRef(false)
  const voiceSessionRef   = useRef(false)
  const sendRef           = useRef<(text: string) => void>(() => {})
  const scrollRef         = useRef<HTMLDivElement>(null)
  const messagesEndRef    = useRef<HTMLDivElement>(null)
  const bestVoiceRef      = useRef<SpeechSynthesisVoice | null>(null)
  const inputRef          = useRef<HTMLTextAreaElement>(null)
  const isAtBottomRef     = useRef(true)
  const ttsVoiceRef       = useRef<string>('en-IN-NeerjaNeural')
  const ttsSpeedRef       = useRef<number>(1.0)    // adjust here if needed
  const ttsStabilityRef   = useRef<number>(0.80)
  const ttsVolumeRef      = useRef<number>(1.0)
  const audioStopRef      = useRef<(() => void) | null>(null)
  const speakingRef       = useRef(false)
  const vuRef             = useRef<ReturnType<typeof setInterval> | null>(null)

  const activeWindowName = activeId ? APPS.find(a => a.id === activeId)?.name || activeId : null

  // Hydrate chat history from localStorage on mount — survives reloads
  useEffect(() => { setMessages(loadHistory()) }, [])
  useEffect(() => { saveHistory(messages) }, [messages])

  // Load TTS voice — localStorage is instant; server is the authoritative fallback
  useEffect(() => {
    try {
      const local = localStorage.getItem('krishna_voice')
      if (local) ttsVoiceRef.current = local
    } catch {}
    fetch('/api/settings').then(r => r.json()).then(s => {
      if (s?.ttsVoice) {
        ttsVoiceRef.current = s.ttsVoice
        try { localStorage.setItem('krishna_voice', s.ttsVoice) } catch {}
      }
    }).catch(() => {})
  }, [])

  // Pick best browser fallback voice (JARVIS-like)
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

  // Scroll anchor
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => { isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40 }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    // Always follow the conversation — this is a small panel, new turns should never go unseen
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, transcript, isProcessing])

  // Trigger from dock / keyboard
  useEffect(() => {
    if (trigger && trigger > 0) { if (expanded) closePanel(); else openPanel() }
  }, [trigger])

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Escape' && expanded) closePanel() }
    window.addEventListener('keydown', down, true)
    return () => window.removeEventListener('keydown', down, true)
  }, [expanded])

  // ── Stop TTS immediately ─────────────────────────────────────────────────
  const stopTTS = useCallback(() => {
    if (audioStopRef.current) { audioStopRef.current(); audioStopRef.current = null }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    speakingRef.current = false
  }, [])

  // ── Stop mic/recording ───────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    listeningRef.current = false
    if (vuRef.current) { clearInterval(vuRef.current); vuRef.current = null }
    setVolume(0)
    // Stop Web Speech API
    if (webSpeechRef.current) {
      try { webSpeechRef.current.stop() } catch {}
      webSpeechRef.current = null
    }
    // Stop MediaRecorder
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
    if (vuRef.current) { clearInterval(vuRef.current); vuRef.current = null }
    setVolume(0)
  }, [stopTTS, stopListening])

  // ── TTS: server Edge TTS first (en-IN-NeerjaNeural), browser fallback ───────
  const speakText = useCallback(async (text: string) => {
    if (muted) { setGlobal('idle'); return }

    stopTTS()
    const clean = toSpeech(text)
    if (!clean) { setGlobal('idle'); return }

    setGlobal('talking')
    speakingRef.current = true

    // ── Try backend TTS (FastAPI → Edge TTS / Pocket TTS) ────────────────
    let usedServer = false
    try {
      const res = await fetch('/api/jarvis/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text:      clean.slice(0, 2000),
          voice:     ttsVoiceRef.current,     // en-IN-NeerjaNeural by default
          speed:     ttsSpeedRef.current,
          stability: ttsStabilityRef.current,
          volume:    ttsVolumeRef.current,
        }),
        signal: AbortSignal.timeout(15000),
      })
      if (res.ok) {
        usedServer = true
        const blob = await res.blob()
        const url  = URL.createObjectURL(blob)
        const audio = new Audio(url)
        await new Promise<void>((resolve) => {
          let done = false
          const finish = () => { if (!done) { done = true; URL.revokeObjectURL(url); audioStopRef.current = null; resolve() } }
          audioStopRef.current = () => { audio.pause(); audio.src = ''; finish() }
          audio.onended = finish
          audio.onerror = finish
          audio.play().catch(finish)
        })
      }
    } catch { /* network error — fall through to browser TTS */ }

    // ── Fallback: browser Web Speech API ─────────────────────────────────
    if (!usedServer && speakingRef.current && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const sentences = toSentences(clean)
      for (const sentence of sentences) {
        if (!speakingRef.current) break
        await new Promise<void>((resolve) => {
          const u = new SpeechSynthesisUtterance(sentence)
          u.voice  = bestVoiceRef.current
          u.rate   = 1.12 + Math.random() * 0.08
          u.pitch  = 0.97 + Math.random() * 0.08
          u.volume = 1.0
          let done = false
          const finish = () => { if (!done) { done = true; audioStopRef.current = null; resolve() } }
          audioStopRef.current = () => { window.speechSynthesis.cancel(); finish() }
          u.onend = finish; u.onerror = finish
          setTimeout(finish, sentence.length * 80 + 2000)
          window.speechSynthesis.speak(u)
        })
        if (speakingRef.current && sentences.indexOf(sentence) < sentences.length - 1) {
          await new Promise(r => setTimeout(r, /[?…]$/.test(sentence.trim()) ? 260 : 140))
        }
      }
    }

    speakingRef.current = false
    setGlobal('idle')

    if (voiceSessionRef.current && !listeningRef.current) {
      setTimeout(() => { if (voiceSessionRef.current && !listeningRef.current) startListening() }, 400)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muted, stopTTS])

  // ── STT: dual system — Web Speech API (instant) + Whisper (quality) ─────
  const startListening = useCallback(async () => {
    if (typeof window === 'undefined' || listeningRef.current) return

    // Get mic access — echo cancellation stops the mic from re-hearing Krishna's own voice
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

    stopTTS()
    listeningRef.current = true
    voiceSessionRef.current = true
    webSpeechFinal.current = ''
    setListening(true)
    setTranscript('')
    setGlobal('listening')

    // ── Web Speech API — real-time display + fallback transcript ─────────
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SR) {
      const rec = new SR()
      rec.continuous = true
      rec.interimResults = true
      rec.lang = 'en-IN'
      webSpeechRef.current = rec
      rec.onresult = (e: any) => {
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

    // ── VAD via AudioContext + VU meter display ───────────────────────────
    const audioCtx = new AudioContext()
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 512
    audioCtx.createMediaStreamSource(stream).connect(analyser)
    const buf = new Uint8Array(analyser.frequencyBinCount)

    // ── MediaRecorder for Whisper quality ────────────────────────────────
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
      : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : ''
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : {})
    recorderRef.current = recorder
    const chunks: Blob[] = []
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

    recorder.onstop = async () => {
      // Tear down audio infra
      stream.getTracks().forEach(t => t.stop())
      audioCtx.close().catch(() => {})
      if (vuRef.current) { clearInterval(vuRef.current); vuRef.current = null }
      setVolume(0)
      setListening(false)
      listeningRef.current = false

      const webSpeechText = webSpeechFinal.current.trim()
      webSpeechFinal.current = ''

      if (!chunks.length && !webSpeechText) {
        // Nothing captured — stop, don't loop
        voiceSessionRef.current = false
        setGlobal('idle')
        return
      }

      // Web Speech transcript is already in hand — use it immediately, no network wait.
      // Only fall back to the Whisper roundtrip if Web Speech gave us nothing.
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
        return  // sendToKrishna manages state from here
      }

      // No speech detected — stop, don't loop
      voiceSessionRef.current = false
      setGlobal('idle')
    }

    recorder.start(250) // collect data every 250ms

    // VAD loop — VU meter + silence detection
    let lastSoundAt = Date.now()
    const startedAt = Date.now()
    vuRef.current = setInterval(() => {
      if (!listeningRef.current) { clearInterval(vuRef.current!); vuRef.current = null; return }
      analyser.getByteFrequencyData(buf)
      const avg = buf.reduce((a, b) => a + b, 0) / buf.length
      setVolume(Math.min(100, avg * 3))
      if (avg > 10) lastSoundAt = Date.now()
      const silentFor = Date.now() - lastSoundAt
      const recordedFor = Date.now() - startedAt
      if (silentFor > 2000 && recordedFor > 700) {
        clearInterval(vuRef.current!); vuRef.current = null
        if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop()
      }
    }, 80)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopTTS])

  // Keep sendRef always pointing to latest sendToKrishna (stale closure guard)
  const toggleListening = useCallback(() => {
    if (listeningRef.current) {
      // User manually stops — end voice session
      voiceSessionRef.current = false
      stopListening()
      setListening(false)
      setGlobal('idle')
      setTranscript('')
    } else {
      // Interrupt TTS if playing, then start listening
      stopTTS()
      startListening()
    }
  }, [startListening, stopListening, stopTTS])

  // ── Send to Krishna API ──────────────────────────────────────────────────
  const sendToKrishna = useCallback(async (text: string) => {
    if (!text.trim() || isProcessing) return
    setIsProcessing(true)
    setMessages(prev => [...prev, { role: 'user', text, ts: Date.now() }])
    setInputText('')
    setGlobal('thinking')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          context: `Active: ${activeWindowName || 'none'}. Windows open: ${windows.length}.`,
          activeWindow: activeWindowName,
        }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      const reply = data.reply || data.spoken || "I'm here."
      const spoken = data.spoken || reply
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

      await speakText(spoken)
    } catch {
      const fallback = "I'm here. How can I help?"
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

    const briefData = (window as any).__krishnaBrief
    if (briefData) {
      (window as any).__krishnaBrief = null
      setMessages(prev => [...prev, { role: 'krishna', text: briefData.text, ts: Date.now() }])
      setTimeout(() => speakText(briefData.spoken || briefData.text), 100)
      return
    }

    let hasHistory = false
    setMessages(m => {
      if (m.length > 0) { hasHistory = true; return m }
      const h = parseInt(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }))
      const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good night'
      const greets = [
        `${g}. Online and ready.`,
        `${g}. How can I help?`,
        `${g}. What do you need?`,
        `${g}. All systems operational.`,
        `${g}. I'm listening.`,
      ]
      const msg = greets[Math.floor(Math.random() * greets.length)]
      setTimeout(() => speakText(msg), 120)
      return [...m, { role: 'krishna', text: msg, ts: Date.now() }]
    })
    if (hasHistory) {
      setTimeout(() => { if (voiceSessionRef.current && !listeningRef.current) startListening() }, 300)
    }
  }, [speakText, startListening])

  const handleTextSend = () => {
    const text = inputText.trim()
    if (!text) return
    sendToKrishna(text)
  }

  const isSpeaking = speakingRef.current
  const stateColor = listening ? '#FF3B30' : isProcessing ? '#0A84FF' : isSpeaking ? '#34C759' : '#5856D6'
  const stateLabel = listening
    ? 'listening'
    : isProcessing ? 'processing'
    : isSpeaking ? 'speaking'
    : 'standby'

  return (
    <AnimatePresence>
      {expanded && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.93 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.93 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="fixed z-[9900] w-[420px] flex flex-col rounded-2xl overflow-hidden"
          style={{
            bottom: '90px', right: '20px',
            maxHeight: '72vh',
            background: 'rgba(6,6,9,0.96)',
            backdropFilter: 'blur(40px) saturate(180%)',
            border: '1px solid rgba(88,86,214,0.25)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(88,86,214,0.12), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          {/* ── Header / HUD bar ─────────────────────────────────────────── */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b"
            style={{ borderColor: 'rgba(88,86,214,0.15)', background: 'rgba(88,86,214,0.06)' }}>

            {/* Animated state dot */}
            <motion.div className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: stateColor, boxShadow: `0 0 10px ${stateColor}` }}
              animate={{ scale: listening ? [1, 1.4, 1] : isSpeaking ? [1, 1.2, 1] : 1, opacity: isProcessing ? [1, 0.4, 1] : 1 }}
              transition={{ duration: listening ? 0.6 : 0.9, repeat: (listening || isSpeaking || isProcessing) ? Infinity : 0 }} />

            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] tracking-[0.2em] text-white/70 uppercase">KRISHNA</span>
              <span className="text-[9px] font-mono text-white/25 uppercase tracking-widest">/ {stateLabel}</span>
            </div>

            {/* VU meter when listening */}
            {listening && (
              <div className="flex items-center gap-0.5 ml-1">
                {Array.from({ length: 8 }).map((_, i) => (
                  <motion.div key={i}
                    className="w-0.5 rounded-full"
                    style={{
                      height: 10,
                      background: volume > i * 12.5 ? '#FF3B30' : 'rgba(255,59,48,0.2)',
                      transformOrigin: 'bottom',
                    }}
                    animate={{ scaleY: volume > i * 12.5 ? [1, 1.5, 1] : 1 }}
                    transition={{ duration: 0.2, repeat: Infinity, delay: i * 0.03 }} />
                ))}
              </div>
            )}

            <div className="ml-auto flex items-center gap-0.5">
              <button onClick={() => setMuted(m => !m)}
                className="text-white/25 hover:text-white/60 p-1.5 transition-colors rounded"
                title={muted ? 'Unmute' : 'Mute'}>
                {muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
              </button>
              <button onClick={closePanel} className="text-white/25 hover:text-white/60 p-1.5 transition-colors rounded">
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* ── Messages ─────────────────────────────────────────────────── */}
          <MessageScroller ref={scrollRef}>
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <motion.div className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #5856D6 0%, #3634A3 100%)', boxShadow: '0 0 24px rgba(88,86,214,0.4)' }}
                  animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 3, repeat: Infinity }}>
                  <Radio className="h-4 w-4 text-white/80" />
                </motion.div>
                <p className="text-[11px] font-mono text-white/20 tracking-wider uppercase">
                  {micSupported ? 'Click mic to speak' : 'Type to connect'}
                </p>
              </div>
            )}

            {messages.map((m, i) => {
              const isKrishna = m.role === 'krishna'
              const prevSameRole = i > 0 && messages[i - 1].role === m.role
              const nextSameRole = i < messages.length - 1 && messages[i + 1].role === m.role
              return (
                <Message key={i} isKrishna={isKrishna}>
                  {isKrishna && (
                    <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-display text-white/80 transition-opacity ${nextSameRole ? 'opacity-0' : 'opacity-100'}`}
                      style={{ background: 'linear-gradient(135deg, #5856D6 0%, #3634A3 100%)', boxShadow: '0 2px 8px rgba(88,86,214,0.4)' }}>
                      K
                    </div>
                  )}
                  <Bubble isKrishna={isKrishna} prevSameRole={prevSameRole} nextSameRole={nextSameRole}>
                    {m.text}
                  </Bubble>
                </Message>
              )
            })}

            {/* Ghost transcript */}
            {listening && transcript && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
                <div className="max-w-[78%] px-3 py-2 rounded-2xl rounded-br-sm text-[12px] italic"
                  style={{ color: 'rgba(255,59,48,0.5)', background: 'rgba(255,59,48,0.06)', border: '0.5px solid rgba(255,59,48,0.12)' }}>
                  {transcript}
                </div>
              </motion.div>
            )}

            {/* Thinking indicator */}
            {isProcessing && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-end gap-2">
                <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-display text-white/80"
                  style={{ background: 'linear-gradient(135deg, #5856D6 0%, #3634A3 100%)', boxShadow: '0 2px 8px rgba(88,86,214,0.4)' }}>K</div>
                <div className="px-3 py-2.5 rounded-2xl rounded-bl-sm"
                  style={{ background: 'rgba(88,86,214,0.12)', border: '0.5px solid rgba(88,86,214,0.2)' }}>
                  <div className="flex gap-1 items-center">
                    {[0, 0.2, 0.4].map(delay => (
                      <motion.div key={delay} className="w-1.5 h-1.5 rounded-full" style={{ background: '#8B89E8' }}
                        animate={{ opacity: [0.3, 1, 0.3], scaleY: [0.6, 1, 0.6] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay, ease: 'easeInOut' }} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </MessageScroller>


          {/* ── Input row ────────────────────────────────────────────────── */}
          <div className="px-3 pb-3 pt-2 flex items-end gap-2 border-t"
            style={{ borderColor: 'rgba(88,86,214,0.12)' }}>

            {micSupported && (
              <button
                onClick={toggleListening}
                disabled={isProcessing && !speakingRef.current}
                title={listening ? 'Stop' : speakingRef.current ? 'Interrupt' : 'Speak'}
                className={`shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition-all duration-200 ${
                  listening
                    ? 'text-white shadow-lg shadow-red-500/40'
                    : speakingRef.current
                    ? 'text-white shadow-lg shadow-green-500/30'
                    : 'text-white/40 hover:text-white/80'
                }`}
                style={{
                  background: listening
                    ? 'linear-gradient(135deg, #FF3B30, #FF2D55)'
                    : speakingRef.current
                    ? 'rgba(52,199,89,0.25)'
                    : 'rgba(255,255,255,0.06)',
                  border: listening
                    ? 'none'
                    : speakingRef.current
                    ? '1px solid rgba(52,199,89,0.4)'
                    : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {listening
                  ? <MicOff className="h-4 w-4" />
                  : <Mic className="h-4 w-4" />
                }
              </button>
            )}

            <textarea
              ref={inputRef}
              className="flex-1 rounded-xl px-3 py-2 text-[12px] outline-none resize-none leading-relaxed"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                color: 'rgba(255,255,255,0.85)',
              }}
              placeholder={isProcessing ? 'Processing…' : 'Message Krishna…'}
              rows={1}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSend() }
              }}
            />

            <button
              onClick={handleTextSend}
              disabled={!inputText.trim() || isProcessing}
              className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-20"
              style={{ background: 'linear-gradient(135deg, #5856D6, #3634A3)' }}>
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
