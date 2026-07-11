'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Volume2, VolumeX, Mic, MicOff, Send, Radio } from 'lucide-react'
import { useWindowStore } from '@/lib/window-store'
import { APPS } from './app-registry'
import { toast } from './toast'
import { MessageScroller, Message, Bubble } from '@/components/ui/chat'

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

// ─── Wallpaper orb ──────────────────────────────────────────────────────────
export function JarvisWallpaperOrb({ onClick, hidden }: { onClick: () => void; hidden: boolean }) {
  const [state, setState] = useState<KrishnaState>('idle')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    const fn = (s: KrishnaState) => setState(s)
    stateListeners.push(fn)
    return () => {
      cancelAnimationFrame(raf)
      const i = stateListeners.indexOf(fn)
      if (i >= 0) stateListeners.splice(i, 1)
    }
  }, [])

  if (!mounted) return null

  const colors: Record<KrishnaState, { core: string; glow: string }> = {
    idle:      { core: '#5856D6', glow: 'rgba(88,86,214,0.25)' },
    listening: { core: '#FF3B30', glow: 'rgba(255,59,48,0.35)' },
    thinking:  { core: '#0A84FF', glow: 'rgba(10,132,255,0.35)' },
    talking:   { core: '#34C759', glow: 'rgba(52,199,89,0.35)' },
  }
  const c = colors[state]
  const size = hidden ? 40 : 80

  return (
    <motion.div
      className="fixed z-[8500] pointer-events-none"
      style={{ bottom: hidden ? '80px' : '40px', right: '24px' }}
      animate={{ opacity: hidden ? 0.4 : 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.button
        onClick={onClick}
        className="relative pointer-events-auto cursor-pointer"
        style={{ width: size, height: size }}
        animate={{ scale: hidden ? 0.5 : 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        whileHover={{ scale: hidden ? 0.6 : 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <motion.div className="absolute inset-0 rounded-full"
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: state === 'talking' ? 0.9 : state === 'idle' ? 4 : 1.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ background: `radial-gradient(circle, ${c.glow} 0%, transparent 70%)` }} />

        {state === 'listening' && [0, 0.7, 1.4].map(d => (
          <motion.div key={d} className="absolute inset-0 rounded-full border-2" style={{ borderColor: c.core }}
            animate={{ scale: [1, 2], opacity: [0.5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: d }} />
        ))}

        {state === 'talking' && (
          <motion.div className="absolute inset-0 rounded-full" style={{ background: c.glow }}
            animate={{ scale: [1, 1.25, 1, 1.15, 1], opacity: [0.3, 0.6, 0.3, 0.5, 0.3] }}
            transition={{ duration: 0.9, repeat: Infinity, times: [0, 0.15, 0.35, 0.55, 1] }} />
        )}

        {state === 'thinking' && (
          <motion.div className="absolute inset-0 rounded-full border-2 border-t-transparent"
            style={{ borderColor: c.core }}
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity }} />
        )}

        <motion.div className="absolute rounded-full flex items-center justify-center overflow-hidden"
          style={{
            inset: '20%',
            background: `linear-gradient(135deg, ${c.core} 0%, ${c.core}CC 100%)`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 12px ${c.glow}`,
          }}
          animate={{ scale: state === 'idle' ? [1, 1.04, 1] : state === 'talking' ? [1, 1.12, 1, 1.08, 1] : 1 }}
          transition={{ duration: state === 'idle' ? 4 : state === 'talking' ? 0.9 : 1, repeat: Infinity }}
        >
          <motion.div className="absolute inset-0 opacity-30" animate={{ rotate: 360 }}
            transition={{ duration: state === 'idle' ? 15 : 4, repeat: Infinity }}
            style={{ background: `conic-gradient(from 0deg, transparent, ${c.core}, transparent 60%, ${c.core}80, transparent)` }} />
          <span className="relative font-display text-white/95" style={{ fontSize: size * 0.22 }}>K</span>
        </motion.div>
      </motion.button>
    </motion.div>
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
    if (isAtBottomRef.current) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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

  // ── TTS: browser Web Speech API — simple, stable, zero server dependency ──
  const speakText = useCallback(async (text: string) => {
    if (muted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setGlobal('idle')
      return
    }

    stopTTS()
    const clean = toSpeech(text)
    if (!clean) { setGlobal('idle'); return }

    setGlobal('talking')
    speakingRef.current = true

    const u = new SpeechSynthesisUtterance(clean)
    u.voice = bestVoiceRef.current
    u.rate  = 0.93
    u.pitch = 1.0
    u.volume = 1.0

    await new Promise<void>((resolve) => {
      let done = false
      const finish = () => { if (!done) { done = true; audioStopRef.current = null; resolve() } }
      audioStopRef.current = () => { window.speechSynthesis.cancel(); finish() }
      u.onend  = finish
      u.onerror = finish
      // safety timeout: ~70ms per char + 3s buffer
      setTimeout(finish, clean.length * 70 + 3000)
      window.speechSynthesis.speak(u)
    })

    speakingRef.current = false
    setGlobal('idle')
    // Push-to-talk only — no auto-restart. Auto-restarting the mic after
    // speaking caused it to pick up Krishna's own voice through speakers,
    // creating a feedback loop (garbage transcript → reply → speak → repeat).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muted, stopTTS])

  // ── STT: dual system — Web Speech API (instant) + Whisper (quality) ─────
  const startListening = useCallback(async () => {
    if (typeof window === 'undefined' || listeningRef.current) return

    // Get mic access
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
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

      // Try Whisper first (server-side quality)
      let finalText = ''
      if (chunks.length) {
        try {
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
          const fd = new FormData()
          fd.append('audio', blob, 'audio.webm')
          const res = await fetch('/api/jarvis/stt', {
            method: 'POST', body: fd,
            signal: AbortSignal.timeout(8000),
          })
          if (res.ok) {
            const { transcript: t } = await res.json()
            if (t?.trim()) finalText = t.trim()
          }
        } catch {}
      }

      // Fallback: use Web Speech API transcript
      if (!finalText && webSpeechText) finalText = webSpeechText

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
      const res = await fetch('/api/jarvis/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context: `Active: ${activeWindowName || 'none'}. Windows open: ${windows.length}.`,
          activeWindow: activeWindowName,
        }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      const reply = data.spoken || "I'm here."
      setMessages(prev => [...prev, { role: 'krishna', text: reply, ts: Date.now() }])
      setIsProcessing(false) // unlock mic before TTS — user can interrupt

      // OS actions
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
    setMessages(m => [...m, { role: 'krishna', text: msg, ts: Date.now() }])
    setTimeout(() => speakText(msg), 120)
  }, [speakText])

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
