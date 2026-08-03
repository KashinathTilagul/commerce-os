'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Volume2, VolumeX, Mic, MicOff, Send, Hand } from 'lucide-react'
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
  const audioStopRef      = useRef<(() => void) | null>(null)
  const speakingRef       = useRef(false)
  const vuRef             = useRef<ReturnType<typeof setInterval> | null>(null)

  const activeWindowName = activeId ? APPS.find(a => a.id === activeId)?.name || activeId : null

  // Hydrate chat history from localStorage on mount — survives reloads
  useEffect(() => { setMessages(loadHistory()) }, [])
  useEffect(() => { saveHistory(messages) }, [messages])

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
  }, [stopTTS, stopListening])

  // ── TTS: browser speech starts immediately after the text response ───────
  const speakText = useCallback(async (text: string) => {
    if (muted) { setGlobal('idle'); return }

    stopTTS()
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
      setListening(false)
      listeningRef.current = false

      const webSpeechText = webSpeechFinal.current.trim()
      webSpeechFinal.current = ''

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

      // Silence is a pause, not the end of a hands-free conversation.
      setGlobal('idle')
      setTimeout(() => {
        if (voiceSessionRef.current && !listeningRef.current) startListening()
      }, 300)
    }

    recorder.start(250) // collect data every 250ms

    // VAD loop — VU meter + silence detection
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
      const spoken = reply
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
    } catch (e: any) {
      // ponytail: this used to swallow the real error and show a fake
      // "I'm here" reply — meaning a broken AI provider looked identical
      // to a working one from the founder's side. Show what actually broke.
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
      const greets = [
        `${g}. Online and ready.`,
        `${g}. How can I help?`,
        `${g}. What do you need?`,
      ]
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

  return (
    <AnimatePresence>
      {expanded && (
        <motion.section
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.22 }}
          className="fixed bottom-24 right-4 z-[9900] w-[min(calc(100vw-2rem),620px)] overflow-hidden rounded-xl border border-cyan-200/25 bg-[#041018]/95 text-white shadow-[0_0_42px_rgba(0,210,255,0.18)] backdrop-blur-xl sm:right-6"
          aria-label="Krishna transcript console"
        >
          <header className="flex items-center justify-between border-b border-cyan-200/15 px-3 py-2">
            <div className="flex items-center gap-3 font-mono text-[10px] tracking-[0.18em] text-cyan-100/70">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_#22d3ee]" />
              KRISHNA / COMMAND CORE
              {hasOpenWindows && <span className="hidden text-white/35 sm:inline">/ CONTEXT LINKED</span>}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setMuted(m => !m)} className="rounded p-2 text-white/55 hover:bg-cyan-300/10 hover:text-cyan-100" title={muted ? 'Unmute Krishna' : 'Mute Krishna'}>
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <button onClick={closePanel} className="rounded p-2 text-white/55 hover:bg-red-400/10 hover:text-red-200" title="Close Krishna">
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          <aside className="flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-cyan-200/15 px-3 py-2 font-mono text-[9px] tracking-[0.18em] text-cyan-100/60">
              <span>LIVE TRANSCRIPT</span>
              <span>{messages.length ? `${messages.length} MESSAGES` : 'READY'}</span>
            </div>
            <MessageScroller ref={scrollRef} className="max-h-32 min-h-14 px-3 py-2 sm:max-h-40">
              {messages.slice(-3).map((m, i) => (
                <Message key={`${m.ts}-${i}`} isKrishna={m.role === 'krishna'} className="mb-1">
                  <Bubble
                    isKrishna={m.role === 'krishna'}
                    className="max-w-[88%] text-[11px] text-cyan-50/90"
                    style={m.role === 'krishna'
                      ? { background: 'rgba(34,211,238,0.10)', borderColor: 'rgba(165,243,252,0.24)' }
                      : { background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(165,243,252,0.16)' }}
                  >
                    {m.text}
                  </Bubble>
                </Message>
              ))}
              {listening && transcript && <p className="px-2 py-1 text-right font-mono text-xs italic text-cyan-100/80">{transcript}</p>}
              {isProcessing && <p className="px-2 py-1 font-mono text-[10px] tracking-widest text-cyan-200/65">KRISHNA IS ANALYZING...</p>}
              {!messages.length && !transcript && <p className="px-2 py-1 font-mono text-[10px] tracking-widest text-cyan-100/45">SPEAK OR TYPE A COMMAND</p>}
              <div ref={messagesEndRef} />
            </MessageScroller>
            <div className="flex items-center gap-2 border-t border-cyan-200/15 p-2">
              <button onClick={toggleListening} disabled={isProcessing && !speakingRef.current} className="grid h-10 w-10 shrink-0 place-items-center rounded border border-cyan-200/30 text-cyan-100 hover:bg-cyan-300/15 disabled:opacity-40" title={listening ? 'Stop listening' : 'Start listening'}>
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <textarea ref={inputRef} rows={1} value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSend() } }}
                className="h-10 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 font-mono text-xs text-cyan-50 outline-none placeholder:text-cyan-100/35"
                placeholder={isProcessing ? 'PROCESSING...' : 'Enter a command for Krishna...'} />
              <button onClick={handleTextSend} disabled={!inputText.trim() || isProcessing} className="grid h-10 w-10 shrink-0 place-items-center rounded border border-cyan-200/35 bg-cyan-300/15 text-cyan-50 hover:bg-cyan-300/30 disabled:opacity-35" title="Send command">
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </aside>

        </motion.section>
      )}
    </AnimatePresence>
  )
}
