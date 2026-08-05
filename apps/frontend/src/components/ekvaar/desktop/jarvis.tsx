'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Volume2, VolumeX, Mic, MicOff, Send, Hand, Sparkles, RotateCcw, Cpu, Zap, Activity, Radio, ChevronRight } from 'lucide-react'
import { useWindowStore } from '@/lib/window-store'
import { toast } from './toast'
import { MessageScroller, Message, Bubble } from '@/components/ui/chat'
import { getSelectedVoiceId, applyVoiceToUtterance } from '@/lib/voice-config'
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

    const voiceId = getSelectedVoiceId()

    // ── 1. Try server neural TTS first (if neural API is available) ──
    try {
      const res = await fetch('/api/jarvis/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean, voice: voiceId, speed: 1.0 }),
        signal: AbortSignal.timeout(4000),
      })
      if (res.ok) {
        const audio = new Audio(URL.createObjectURL(await res.blob()))
        audio.volume = 1
        audioStopRef.current = () => { audio.pause(); URL.revokeObjectURL(audio.src) }
        await new Promise<void>((resolve) => {
          audio.onended = () => resolve()
          audio.onerror = () => resolve()
          audio.play().catch(() => resolve())
        })
        speakingRef.current = false
        setGlobal('idle')
        if (voiceSessionRef.current && !listeningRef.current && !speakingRef.current) {
          setTimeout(() => {
            if (voiceSessionRef.current && !listeningRef.current && !speakingRef.current && (!window.speechSynthesis || !window.speechSynthesis.speaking)) {
              startListening()
            }
          }, 500)
        }
        return
      }
    } catch {}

    // ── 2. Fallback to continuous, natural browser SpeechSynthesis ──
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      await new Promise<void>((resolve) => {
        const u = new SpeechSynthesisUtterance(clean)
        applyVoiceToUtterance(u, window.speechSynthesis, voiceId)
        let done = false
        const finish = () => { if (!done) { done = true; audioStopRef.current = null; resolve() } }
        audioStopRef.current = () => { window.speechSynthesis.cancel(); finish() }
        u.onend = finish
        u.onerror = (e) => { console.error('[TTS Error]', e); finish() }
        setTimeout(finish, clean.length * 90 + 4000)
        window.speechSynthesis.speak(u)
      })
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
  }, [muted, stopTTS, stopListening, startListening])

  const startListening = useCallback(async () => {
    if (typeof window === 'undefined' || listeningRef.current || speakingRef.current) return
    if (typeof window !== 'undefined' && window.speechSynthesis?.speaking) return
    stopTTS()
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      toast.error('Microphone error', 'Could not access your microphone.')
      setGlobal('idle')
      return
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        const ctx = new AudioCtx()
        const src = ctx.createMediaStreamSource(stream)
        const ana = ctx.createAnalyser()
        ana.fftSize = 64
        src.connect(ana)
        setAnalyserNode(ana)
      }
    } catch {}

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRec) {
      const rec = new SpeechRec()
      rec.continuous = false
      rec.interimResults = true
      rec.lang = 'en-US'
      webSpeechRef.current = rec
      webSpeechFinal.current = ''
      rec.onresult = (e: any) => {
        let interim = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
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
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ type: 'spring', damping: 26, stiffness: 340 }}
          className="fixed bottom-20 right-4 z-[9900] w-[min(calc(100vw-2rem),460px)] overflow-hidden rounded-3xl border border-white/15 bg-[#0a0a0c]/80 text-white shadow-[0_20px_60px_rgba(0,0,0,0.6),0_1px_0_rgba(255,255,255,0.1)_inset] backdrop-blur-3xl sm:right-6"
          aria-label="Krishna AI Assistant"
        >
          {/* Apple Liquid Header */}
          <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-white/[0.03]">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-2.5 w-2.5 items-center justify-center">
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                  gState === 'listening' ? 'bg-rose-400' : gState === 'talking' ? 'bg-emerald-400' : gState === 'thinking' ? 'bg-purple-400' : 'bg-cyan-400'
                }`} />
                <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                  gState === 'listening' ? 'bg-rose-400' : gState === 'talking' ? 'bg-emerald-400' : gState === 'thinking' ? 'bg-purple-400' : 'bg-cyan-400'
                }`} />
              </div>
              <span className="font-medium text-sm text-white/90">Krishna AI</span>
              {activeWindowName && (
                <span className="text-xs text-white/40 font-normal">
                  · {activeWindowName}
                </span>
              )}
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
            <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-4 py-2 text-xs text-white/70">
              <span className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                <span className="capitalize">{gState}...</span>
              </span>
              <div className="flex items-center gap-1">
                {[0.4, 0.8, 0.5, 0.9, 0.6].map((h, i) => (
                  <motion.span
                    key={i}
                    className="w-0.5 rounded-full bg-cyan-400"
                    animate={{ height: gState === 'talking' || gState === 'listening' ? [6, 16, 6] : 8 }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
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
                    ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.5)]'
                    : speakingRef.current
                    ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                    : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
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

        </motion.section>
      )}
    </AnimatePresence>
  )
}
