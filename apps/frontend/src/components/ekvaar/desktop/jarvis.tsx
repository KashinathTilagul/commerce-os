'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Volume2, VolumeX, Mic, MicOff, Send, Hand, Sparkles, RotateCcw, Cpu, Zap, Activity, Radio, ChevronRight } from 'lucide-react'
import { useWindowStore } from '@/lib/window-store'
import { APPS } from './app-registry'
import { toast } from './toast'
import { MessageScroller, Message, Bubble } from '@/components/ui/chat'
import { getSelectedVoiceId, getSelectedVoiceSpeed, applyVoiceToUtterance } from '@/lib/voice-config'
import { decodePcm16Chunk, parseFluxTurn } from '@/lib/deepgram-voice'
import type { FrameDebug, TrackerStatus, Pose } from '@/lib/hand-tracker'
import { PINCH_ON } from '@/lib/hand-tracker'

const APP_NAMES: Record<string, string> = {
  command: 'Command Center', inbox: 'Inbox', agents: 'Agents', issues: 'Issues',
  terminal: 'Terminal', activity: 'Activity', settings: 'Settings', files: 'Files',
  integrations: 'Integrations', calculator: 'Calculator', notes: 'Notes',
  calendar: 'Calendar', music: 'Spotify', sales: 'Sales & Orders', finance: 'Finance',
  inventory: 'Inventory Ops', community: 'Community', campaigns: 'Campaigns',
  guardian: 'Brand Intelligence', ai: 'AI Systems', risk: 'Risk Center', health: 'Health Monitor',
  memory: 'Memory Explorer', launches: 'Product Launches', explorer: 'Workspace Explorer'
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

let deepgramTokenCache: { value: string; expiresAt: number } | null = null
async function getDeepgramAccessToken(): Promise<string> {
  if (deepgramTokenCache && deepgramTokenCache.expiresAt > Date.now() + 5_000) return deepgramTokenCache.value
  const response = await fetch('/api/jarvis/deepgram-token', { method: 'POST' })
  if (!response.ok) throw new Error('Deepgram is not configured')
  const data = await response.json()
  if (!data.accessToken) throw new Error('Deepgram token missing')
  deepgramTokenCache = {
    value: data.accessToken,
    expiresAt: Date.now() + Math.max(10, Number(data.expiresIn) || 30) * 1_000,
  }
  return data.accessToken
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
  idle: '#22d3ee', listening: '#f43f5e', thinking: '#a855f7', talking: '#10b981',
}

// Sleek Apple Liquid Glass top bar status icon
export function KrishnaMenuBarIcon({ onClick }: { onClick: () => void }) {
  const state = useKrishnaState()
  const color = STATE_COLOR[state]
  return (
    <button
      title="Krishna AI"
      onClick={onClick}
      className="group relative p-1.5 rounded-full hover:bg-white/10 transition-all flex items-center justify-center"
    >
      <div className="relative flex items-center justify-center h-3.5 w-3.5">
        <motion.div
          style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }}
          animate={{
            scale: state === 'idle' ? [1, 1.2, 1] : state === 'talking' ? [1, 1.35, 1] : [1, 1.25, 1],
            opacity: state === 'idle' ? [0.7, 1, 0.7] : 1,
          }}
          transition={{ duration: state === 'idle' ? 2.2 : state === 'listening' ? 0.6 : 0.4, repeat: Infinity }}
        />
      </div>
    </button>
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
  const [displayTitle, setDisplayTitle] = useState('Krishna AI')
  const [listening, setListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [micSupported, setMicSupported] = useState(true)
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null)

  const recorderRef       = useRef<MediaRecorder | null>(null)
  const voiceSocketRef    = useRef<WebSocket | null>(null)
  const micAudioContextRef = useRef<AudioContext | null>(null)
  const webSpeechRef      = useRef<any>(null)
  const webSpeechFinal    = useRef<string>('')
  const listeningRef      = useRef(false)
  const sendRef           = useRef<(text: string) => void>(() => {})
  const scrollRef         = useRef<HTMLDivElement>(null)
  const messagesEndRef    = useRef<HTMLDivElement>(null)
  const bestVoiceRef      = useRef<SpeechSynthesisVoice | null>(null)
  const inputRef          = useRef<HTMLTextAreaElement>(null)
  const audioStopRef      = useRef<(() => void) | null>(null)
  const speakingRef       = useRef(false)
  const speakGenRef       = useRef(0)
  const vuRef             = useRef<ReturnType<typeof setInterval> | null>(null)

  const activeWindowName = activeId ? (APP_NAMES[activeId] || activeId) : null

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

  // Auto-scroll chat stream to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isProcessing, transcript])

  useEffect(() => {
    if (trigger && trigger > 0) { if (expanded) closePanel(); else openPanel() }
  }, [trigger])

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Escape' && expanded) closePanel() }
    window.addEventListener('keydown', down, true)
    return () => { window.removeEventListener('keydown', down, true) }
  }, [expanded])

  useEffect(() => {
    if (gState === 'talking') {
      setDisplayTitle('J.A.R.V.I.S.')
      const t = setTimeout(() => setDisplayTitle('Krishna AI'), 2000)
      return () => clearTimeout(t)
    }
    setDisplayTitle('Krishna AI')
  }, [gState])

  const stopTTS = useCallback(() => {
    speakGenRef.current++
    if (audioStopRef.current) { audioStopRef.current(); audioStopRef.current = null }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    speakingRef.current = false
  }, [])

  const stopListening = useCallback(() => {
    listeningRef.current = false
    setAnalyserNode(null)
    micAudioContextRef.current?.close().catch(() => {})
    micAudioContextRef.current = null
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
    if (voiceSocketRef.current?.readyState === WebSocket.OPEN) {
      try { voiceSocketRef.current.send(JSON.stringify({ type: 'CloseStream' })) } catch {}
      const socket = voiceSocketRef.current
      setTimeout(() => socket.close(), 500)
    }
    voiceSocketRef.current = null
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop() } catch {}
    }
  }, [])

  const closePanel = useCallback(() => {
    setExpanded(false)
    stopTTS()
    stopListening()
    setGlobal('idle')
    setListening(false)
    setTranscript('')
    setAnalyserNode(null)
    if (vuRef.current) { clearInterval(vuRef.current); vuRef.current = null }
  }, [stopTTS, stopListening])

  const startListening = useCallback(async () => {
    if (typeof window === 'undefined') return
    if (listeningRef.current) return
    if (window.speechSynthesis?.speaking) window.speechSynthesis.cancel()
    stopTTS()

    listeningRef.current = true
    setListening(true)
    setGlobal('listening')

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
    } catch (e) {
      console.error('[Mic Error]', e)
      toast.error('Microphone error', 'Could not access your microphone. Please allow mic access in your browser.')
      listeningRef.current = false
      setListening(false)
      setGlobal('idle')
      return
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        const ctx = new AudioCtx()
        micAudioContextRef.current = ctx
        const src = ctx.createMediaStreamSource(stream)
        const ana = ctx.createAnalyser()
        ana.fftSize = 64
        src.connect(ana)
        setAnalyserNode(ana)
      }
    } catch {}

    // Deepgram Flux is the primary path: live multilingual transcription,
    // model-integrated turn detection, and no upload/transcribe round trip.
    try {
      const accessToken = await getDeepgramAccessToken()
      const params = new URLSearchParams({
        model: 'flux-general-multi',
        eager_eot_threshold: '0.5',
        eot_threshold: '0.7',
        eot_timeout_ms: '700',
      })
      for (const language of ['en', 'hi']) params.append('language_hint', language)
      for (const term of ['Ekvaar', 'Krishna', 'Composio', 'OmniRoute']) params.append('keyterm', term)
      const socket = new WebSocket(`wss://api.deepgram.com/v2/listen?${params}`, ['bearer', accessToken])
      voiceSocketRef.current = socket
      const opened = await new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 2_000)
        socket.onopen = () => { clearTimeout(timeout); resolve(true) }
        socket.onerror = () => { clearTimeout(timeout); resolve(false) }
      })

      if (opened) {
        const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : ''
        const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : {})
        recorderRef.current = recorder
        let finalized = false
        let latestTranscript = ''

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) socket.send(event.data)
        }
        recorder.onstop = () => {
          stream.getTracks().forEach(track => track.stop())
          micAudioContextRef.current?.close().catch(() => {})
          micAudioContextRef.current = null
          setAnalyserNode(null)
          setListening(false)
          listeningRef.current = false
          if (socket.readyState === WebSocket.OPEN) {
            try { socket.send(JSON.stringify({ type: 'CloseStream' })) } catch {}
          }
        }
        socket.onmessage = (event) => {
          if (typeof event.data !== 'string') return
          try {
            const turn = parseFluxTurn(JSON.parse(event.data))
            if (!turn || finalized) return
            latestTranscript = turn.text
            setTranscript(turn.text)
            if (!turn.final) return
            finalized = true
            if (recorder.state !== 'inactive') recorder.stop()
            socket.close()
            voiceSocketRef.current = null
            setTranscript('')
            sendRef.current(turn.text)
          } catch {}
        }
        socket.onclose = () => {
          voiceSocketRef.current = null
          if (finalized) return
          if (recorder.state !== 'inactive') recorder.stop()
          setTranscript('')
          if (latestTranscript) sendRef.current(latestTranscript)
          else setGlobal('idle')
        }
        recorder.start(80)
        return
      }

      socket.close()
      voiceSocketRef.current = null
    } catch (error) {
      console.warn('[Deepgram STT fallback]', error)
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRec) {
      const rec = new SpeechRec()
      rec.continuous = true
      rec.interimResults = true
      rec.lang = 'en-IN'
      webSpeechRef.current = rec
      webSpeechFinal.current = ''
      rec.onresult = (e: any) => {
        let interim = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript
          if (e.results[i].isFinal) {
            webSpeechFinal.current = (webSpeechFinal.current + ' ' + t).trim()
          } else {
            interim += t
          }
        }
        setTranscript(webSpeechFinal.current || interim || 'Listening…')
      }
      rec.onerror = (err: any) => {
        console.warn('[WebSpeech Warning]', err.error)
      }
      rec.onend = () => {}
      try { rec.start() } catch {}
    }

    micAudioContextRef.current?.close().catch(() => {})
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    micAudioContextRef.current = audioCtx
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
      micAudioContextRef.current = null
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
            signal: AbortSignal.timeout(20_000),
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
    }

    try { recorder.start(250) } catch {}
    let lastSoundAt = Date.now()
    const startedAt = Date.now()
    vuRef.current = setInterval(() => {
      if (!listeningRef.current) { clearInterval(vuRef.current!); vuRef.current = null; return }
      analyser.getByteFrequencyData(buf)
      const avg = buf.reduce((a, b) => a + b, 0) / buf.length
      if (avg > 10) lastSoundAt = Date.now()
      const silentFor = Date.now() - lastSoundAt
      const recordedFor = Date.now() - startedAt
      if (silentFor > 950 && recordedFor > 550) {
        clearInterval(vuRef.current!); vuRef.current = null
        if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop()
      }
    }, 80)
  }, [stopTTS])

  const speakWithDevice = useCallback((clean: string, voiceId: string): Promise<void> => {
    return new Promise<void>((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return resolve()
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel()
      }
      window.speechSynthesis.resume()

      setTimeout(() => {
        const u = new SpeechSynthesisUtterance(clean)
        applyVoiceToUtterance(u, window.speechSynthesis, voiceId)
        let done = false
        const finish = () => { if (!done) { done = true; audioStopRef.current = null; resolve() } }
        audioStopRef.current = () => { window.speechSynthesis.cancel(); finish() }
        u.onend = finish
        u.onerror = (e: any) => {
          if (e.error !== 'canceled' && e.error !== 'interrupted') {
            console.warn('[TTS Warning]', e.error || e)
          }
          finish()
        }
        setTimeout(finish, clean.length * 90 + 4000)
        try {
          window.speechSynthesis.speak(u)
        } catch {
          finish()
        }
      }, 50)
    })
  }, [])

  const speakWithDeepgram = useCallback(async (
    clean: string,
    voiceId: string,
    onAudioStart: () => boolean,
  ): Promise<boolean> => {
    if (!voiceId.startsWith('deepgram:')) return false
    try {
      const accessToken = await getDeepgramAccessToken()
      const model = voiceId.slice('deepgram:'.length)
      const speed = getSelectedVoiceSpeed()
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return false
      const context: AudioContext = new AudioCtx({ sampleRate: 24_000 })
      await context.resume()

      return await new Promise<boolean>((resolve) => {
        const params = new URLSearchParams({ model, encoding: 'linear16', sample_rate: '24000', speed: String(speed) })
        const socket = new WebSocket(`wss://api.deepgram.com/v2/speak?${params}`, ['bearer', accessToken])
        socket.binaryType = 'arraybuffer'
        const sources = new Set<AudioBufferSourceNode>()
        let carry = new Uint8Array()
        let nextStart = 0
        let started = false
        let done = false
        const timeout = setTimeout(() => finish(false), 15_000)

        const stopAudio = () => {
          for (const source of sources) {
            try { source.stop() } catch {}
          }
          sources.clear()
        }
        const finish = (success: boolean) => {
          if (done) return
          done = true
          clearTimeout(timeout)
          stopAudio()
          try { socket.close() } catch {}
          context.close().catch(() => {})
          if (audioStopRef.current === stop) audioStopRef.current = null
          resolve(success)
        }
        const finishAfterQueuedAudio = () => {
          const waitMs = Math.max(0, (nextStart - context.currentTime) * 1_000) + 40
          setTimeout(() => finish(started), waitMs)
        }
        const stop = () => finish(false)
        audioStopRef.current = stop

        socket.onopen = () => {
          socket.send(JSON.stringify({ type: 'Speak', text: clean }))
          socket.send(JSON.stringify({ type: 'Flush' }))
        }
        socket.onmessage = (event) => {
          if (typeof event.data === 'string') {
            try {
              const message = JSON.parse(event.data)
              if (message.type === 'SpeechMetadata' || message.type === 'Flushed') finishAfterQueuedAudio()
              if (message.type === 'Error') finish(false)
            } catch {}
            return
          }
          if (!(event.data instanceof ArrayBuffer) || done) return
          const decoded = decodePcm16Chunk(event.data, carry)
          carry = decoded.carry
          if (!decoded.samples.length) return
          if (!started) {
            if (!onAudioStart()) return finish(false)
            started = true
          }
          const buffer = context.createBuffer(1, decoded.samples.length, 24_000)
          buffer.copyToChannel(decoded.samples, 0)
          const source = context.createBufferSource()
          source.buffer = buffer
          source.connect(context.destination)
          source.onended = () => sources.delete(source)
          const at = Math.max(context.currentTime + 0.015, nextStart)
          source.start(at)
          nextStart = at + buffer.duration
          sources.add(source)
        }
        socket.onerror = () => finish(false)
        socket.onclose = () => { if (!done) finishAfterQueuedAudio() }
      })
    } catch (error) {
      console.warn('[Deepgram TTS fallback]', error)
      return false
    }
  }, [])

  const speakText = useCallback(async (text: string) => {
    if (muted) { setGlobal('idle'); return }
    stopTTS()
    stopListening()
    const clean = toSpeech(text)
    if (!clean) { setGlobal('idle'); return }
    setGlobal('talking')
    speakingRef.current = true
    const gen = ++speakGenRef.current

    const voiceId = getSelectedVoiceId()

    // ── 1. Flux streams raw PCM immediately; otherwise the device voice
    // starts on its own deadline so speech follows the text without a long gap.
    // A late neural reply is dropped rather than double-speaking. ──
    let deviceStarted = false
    let deviceDone: Promise<void> | null = null
    const startDevice = () => {
      if (deviceStarted || !speakingRef.current || speakGenRef.current !== gen) return
      deviceStarted = true
      deviceDone = speakWithDevice(clean, voiceId)
    }
    const deviceDeadline = setTimeout(startDevice, 650)

    const streamed = await speakWithDeepgram(clean, voiceId, () => {
      if (deviceStarted || !speakingRef.current || speakGenRef.current !== gen) return false
      clearTimeout(deviceDeadline)
      return true
    })
    if (streamed && speakGenRef.current === gen) {
      speakingRef.current = false
      setGlobal('idle')
      if (expanded && micSupported) setTimeout(() => startListening(), 80)
      return
    }

    if (!deviceStarted) {
      try {
        const res = await fetch('/api/jarvis/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean, voice: voiceId, speed: getSelectedVoiceSpeed() }),
        signal: AbortSignal.timeout(20_000),
      })
        if (res.ok && res.headers.get('content-type')?.includes('audio') && speakingRef.current && !deviceStarted && speakGenRef.current === gen) {
          clearTimeout(deviceDeadline)
          const audio = new Audio(URL.createObjectURL(await res.blob()))
          audio.volume = 1
          await new Promise<void>((resolve) => {
            audio.onended = () => resolve()
            audio.onerror = () => resolve()
            // pause() fires neither onended nor onerror — resolve here so an
            // interrupt can't leave the caller awaiting forever.
            audioStopRef.current = () => { audio.pause(); URL.revokeObjectURL(audio.src); audioStopRef.current = null; resolve() }
            audio.play().catch(() => resolve())
          })
          if (speakGenRef.current === gen) {
            speakingRef.current = false
            setGlobal('idle')
            if (expanded && micSupported) setTimeout(() => startListening(), 80)
          }
          return
        }
      } catch {}
    }

    // ── 2. Device voice (already started by the deadline, or start now) ──
    clearTimeout(deviceDeadline)
    if (speakGenRef.current !== gen) return
    startDevice()
    if (deviceDone) await deviceDone
    if (speakGenRef.current !== gen) return
    speakingRef.current = false
    setGlobal('idle')
    if (expanded && micSupported) setTimeout(() => startListening(), 80)
  }, [muted, stopTTS, stopListening, expanded, micSupported, startListening, speakWithDevice, speakWithDeepgram])

  const toggleListening = useCallback(() => {
    if (listeningRef.current) {
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
    }, 100)
  }, [])

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
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed bottom-20 right-4 z-[9900] w-[min(calc(100vw-2rem),460px)] overflow-hidden rounded-3xl border border-white/15 bg-[#0a0a0c]/80 text-white shadow-[0_20px_60px_rgba(0,0,0,0.6),0_1px_0_rgba(255,255,255,0.1)_inset] backdrop-blur-3xl sm:right-6"
          aria-label="Krishna AI Assistant"
        >
          {/* Apple Liquid Header */}
          <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-white/[0.03]">
            <div className="flex items-center gap-2.5">
              <motion.div
                className="relative flex h-6 w-6 items-center justify-center"
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              >
                <motion.div
                  className="absolute rounded-full"
                  style={{ width: 22, height: 22, border: '1.5px solid #22d3ee' }}
                  animate={{
                    scale: gState === 'idle' ? [1, 1.15, 1] : gState === 'listening' ? [1, 1.2, 0.9, 1.1, 1] : gState === 'thinking' ? [1, 1.1, 1] : [1, 1.3, 0.95, 1.15, 1],
                    opacity: gState === 'idle' ? [0.4, 0.8, 0.4] : 0.7,
                    borderColor: gState === 'listening' ? ['#22d3ee', '#f43f5e', '#22d3ee'] : gState === 'thinking' ? ['#a855f7', '#6366f1', '#a855f7'] : gState === 'talking' ? ['#10b981', '#22d3ee', '#10b981'] : '#22d3ee',
                    rotate: gState === 'thinking' ? [0, 90, 180, 270, 360] : 0,
                  }}
                  transition={{ duration: gState === 'idle' ? 3 : gState === 'listening' ? 1.2 : gState === 'thinking' ? 4 : 1.5, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                  className="absolute rounded-full"
                  style={{ width: 16, height: 16, border: '1.5px solid #22d3ee' }}
                  animate={{
                    scale: gState === 'idle' ? [1, 1.1, 1] : gState === 'listening' ? [0.9, 1.1, 0.85, 1.05, 1] : gState === 'thinking' ? [1, 1.05, 1] : [1, 1.2, 0.9, 1.1, 1],
                    opacity: gState === 'idle' ? [0.5, 0.9, 0.5] : 0.8,
                    borderColor: gState === 'listening' ? ['#22d3ee', '#22d3ee', '#f43f5e', '#22d3ee'] : gState === 'thinking' ? ['#a855f7', '#6366f1', '#a855f7'] : gState === 'talking' ? ['#10b981', '#22d3ee', '#10b981'] : '#22d3ee',
                    rotate: gState === 'thinking' ? [0, -90, -180, -270, -360] : 0,
                  }}
                  transition={{ duration: gState === 'idle' ? 2.5 : gState === 'listening' ? 1 : gState === 'thinking' ? 3.5 : 1.3, repeat: Infinity, ease: 'easeInOut', delay: gState === 'thinking' ? 0.3 : 0 }}
                />
                <motion.div
                  className="rounded-full"
                  style={{ width: 10, height: 10, background: '#22d3ee' }}
                  animate={{
                    scale: gState === 'idle' ? [1, 1.15, 1] : gState === 'listening' ? [1, 1.2, 0.85, 1.1, 1] : gState === 'thinking' ? [1, 1.1, 1] : [1, 1.25, 0.9, 1.15, 1],
                    opacity: gState === 'idle' ? [0.7, 1, 0.7] : 1,
                    background: gState === 'listening' ? ['#22d3ee', '#f43f5e', '#22d3ee'] : gState === 'thinking' ? ['#a855f7', '#6366f1', '#a855f7'] : gState === 'talking' ? ['#10b981', '#22d3ee', '#10b981'] : '#22d3ee',
                  }}
                  transition={{ duration: gState === 'idle' ? 2 : gState === 'listening' ? 0.8 : gState === 'thinking' ? 3 : 1.1, repeat: Infinity, ease: 'easeInOut' }}
                />
              </motion.div>
              <div className="flex items-center">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={displayTitle}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.3 }}
                    className="font-medium text-sm text-white/90"
                  >
                    {displayTitle}
                  </motion.span>
                </AnimatePresence>
                {activeWindowName && (
                  <span className="text-xs text-white/40 font-normal">· {activeWindowName}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setMessages([])} className="rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition-colors" title="Clear chat history">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setMuted(m => !m)} className="rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition-colors" title={muted ? 'Unmute' : 'Mute'}>
                {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </button>
              <button onClick={closePanel} className="rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition-colors" title="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>



          {/* Liquid Voice Status Indicator when active */}
          {gState !== 'idle' && (
            <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-4 py-2 text-xs" style={{ color: STATE_COLOR[gState] }}>
              <span className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" style={{ color: STATE_COLOR[gState] }} />
                <span className="capitalize">{gState}...</span>
              </span>
              <div className="relative flex h-4 w-4 items-center justify-center">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute rounded-full"
                    style={{ width: 6 + i * 4, height: 6 + i * 4, border: '1px solid', borderColor: STATE_COLOR[gState] }}
                    animate={{ scale: [1, 2.5], opacity: [0.8, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4, ease: 'easeOut' }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Quick Action Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-white/5 px-3 py-2 no-scrollbar">
            {QUICK_COMMANDS.map((cmd) => (
              <button
                key={cmd.label}
                onClick={() => sendToKrishna(cmd.prompt)}
                disabled={isProcessing}
                className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/80 hover:border-white/25 hover:bg-white/15 hover:text-white transition-all disabled:opacity-40"
              >
                {cmd.label}
              </button>
            ))}
          </div>

          {/* Stream Console */}
          <aside className="flex flex-col overflow-hidden">
            <MessageScroller ref={scrollRef} className="max-h-48 min-h-24 px-4 py-3 sm:max-h-52">
              {messages.slice(-4).map((m, i) => (
                <Message key={`${m.ts}-${i}`} isKrishna={m.role === 'krishna'} className="mb-2">
                  <Bubble
                    isKrishna={m.role === 'krishna'}
                    className="max-w-[85%] text-xs leading-relaxed rounded-2xl px-3.5 py-2.5"
                    style={m.role === 'krishna'
                      ? { background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#F5F1EA' }
                      : { background: 'rgba(34, 211, 238, 0.2)', border: '1px solid rgba(34, 211, 238, 0.3)', color: '#FFFFFF' }}
                  >
                    {m.text}
                  </Bubble>
                </Message>
              ))}
              {listening && transcript && (
                <div className="my-1.5 flex items-center justify-end gap-2 px-2 py-1 text-xs text-rose-300 italic">
                  <Radio className="h-3 w-3 animate-pulse text-rose-400" />
                  <span>{transcript}</span>
                </div>
              )}
              {isProcessing && (
                <div className="my-1.5 flex items-center gap-2 px-2 py-1 text-xs text-white/50">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                  <span>Krishna is analyzing...</span>
                </div>
              )}
              {!messages.length && !transcript && (
                <p className="px-2 py-4 text-center text-xs text-white/40">
                  Speak or type a command for Krishna AI
                </p>
              )}
              <div ref={messagesEndRef} />
            </MessageScroller>

            {/* Apple Liquid Glass Input Pill Dock */}
            <div className="flex items-center gap-2 border-t border-white/10 bg-white/[0.02] p-3">
              <button
                onClick={toggleListening}
                disabled={isProcessing && !speakingRef.current}
                className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-full transition-all ${
                  listening
                    ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.6)]'
                    : speakingRef.current
                    ? 'bg-cyan-400 text-white shadow-[0_0_20px_rgba(34,211,238,0.6)]'
                    : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white border border-cyan-500/20'
                }`}
                title={listening ? 'Stop listening' : 'Start voice'}
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <textarea
                ref={inputRef}
                rows={1}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSend() } }}
                className="h-9 min-w-0 flex-1 resize-none rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-white outline-none placeholder:text-white/40 focus:border-white/30 focus:bg-white/10 transition-all"
                placeholder={isProcessing ? 'Thinking...' : 'Ask Krishna anything...'}
              />
              <button
                onClick={handleTextSend}
                disabled={!inputText.trim() || isProcessing}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white hover:bg-white/25 disabled:opacity-30 transition-all"
                title="Send"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </aside>
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 1px, rgba(34,211,238,0.015) 1px, rgba(34,211,238,0.015) 3px)' }} />

        </motion.section>
      )}
    </AnimatePresence>
  )
}
