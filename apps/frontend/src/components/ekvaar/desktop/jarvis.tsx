'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Volume2, VolumeX, Mic, MicOff, Send } from 'lucide-react'
import { useWindowStore } from '@/lib/window-store'
import { APPS } from './app-registry'
import { toast } from './toast'
import { MessageScroller, Message, Bubble } from '@/components/ui/chat'

type KrishnaState = 'idle' | 'listening' | 'thinking' | 'talking'

interface Message { role: 'user' | 'krishna'; text: string; ts: number }

// ─── Preprocess text for natural speech ────────────────────────────────────
function toSpeech(text: string): string {
  const expand: Record<string, string> = {
    'CMO': 'Chief Marketing Officer', 'CTO': 'Chief Technology Officer',
    'CFO': 'Chief Financial Officer', 'COO': 'Chief Operating Officer',
    'CCO': 'Chief Creative Officer', 'CSM': 'Customer Success Manager',
    'CEO': 'Chief Executive Officer', 'ROAS': 'return on ad spend',
    'P&L': 'profit and loss', 'Q1': 'quarter one', 'Q2': 'quarter two',
    'Q3': 'quarter three', 'Q4': 'quarter four', 'API': 'A P I',
    '₹': 'rupees ', 'EKVAAR': 'Ekvaar', 'AI': 'A I', 'KPI': 'K P I',
  }
  let r = text.replace(/^SPOKEN:\s*/i, '').replace(/[*_#`>]/g, '').replace(/\n+/g, '. ')
  for (const [k, v] of Object.entries(expand)) {
    r = r.replace(new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), v)
  }
  return r.replace(/(\d+\.?\d*)%/g, '$1 percent').replace(/\s+/g, ' ').trim()
}

// Split long text into speakable sentences
function toSentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]*/g)?.map(s => s.trim()).filter(s => s.length > 2) || [text]
}

// ─── Global state bus ───────────────────────────────────────────────────────
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
    return () => { cancelAnimationFrame(raf); const i = stateListeners.indexOf(fn); if (i >= 0) stateListeners.splice(i, 1) }
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
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: state === 'talking' ? 0.9 : state === 'idle' ? 4 : 1.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ background: `radial-gradient(circle, ${c.glow} 0%, transparent 70%)` }}
        />
        {state === 'listening' && [0, 0.7, 1.4].map(d => (
          <motion.div key={d} className="absolute inset-0 rounded-full border-2" style={{ borderColor: c.core }}
            animate={{ scale: [1, 2], opacity: [0.5, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: d }} />
        ))}
        {state === 'talking' && (
          <motion.div className="absolute inset-0 rounded-full" style={{ background: c.glow }}
            animate={{ scale: [1, 1.25, 1, 1.15, 1], opacity: [0.3, 0.6, 0.3, 0.5, 0.3] }}
            transition={{ duration: 0.9, repeat: Infinity, times: [0, 0.15, 0.35, 0.55, 1] }} />
        )}
        {state === 'thinking' && (
          <motion.div className="absolute inset-0 rounded-full border-2 border-t-transparent"
            style={{ borderColor: c.core }} animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity }} />
        )}
        <motion.div
          className="absolute rounded-full flex items-center justify-center overflow-hidden"
          style={{
            inset: '20%',
            background: `linear-gradient(135deg, ${c.core} 0%, ${c.core}CC 100%)`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 12px ${c.glow}`,
          }}
          animate={{ scale: state === 'idle' ? [1, 1.04, 1] : state === 'talking' ? [1, 1.12, 1, 1.08, 1] : 1 }}
          transition={{ duration: state === 'idle' ? 4 : state === 'talking' ? 0.9 : 1, repeat: Infinity, times: state === 'talking' ? [0, 0.15, 0.35, 0.55, 1] : undefined }}
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
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [transcript, setTranscript] = useState('')
  const [muted, setMuted] = useState(false)
  const [listening, setListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [micSupported, setMicSupported] = useState(true)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const listeningRef = useRef(false)
  const voiceSessionRef = useRef(false)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sendRef = useRef<(text: string) => void>(() => {})
  const scrollRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const bestVoiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const activeWindowName = activeId ? APPS.find(a => a.id === activeId)?.name || activeId : null
  const isAtBottomRef = useRef(true)
  const ttsVoiceRef = useRef<string>('en-IN-NeerjaNeural')
  // Interruptible TTS — store stop handle so mic click cancels playback immediately
  const audioStopRef = useRef<(() => void) | null>(null)
  const speakingRef = useRef(false)

  // Load saved TTS voice from settings
  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => {
      if (s?.ttsVoice) ttsVoiceRef.current = s.ttsVoice
    }).catch(() => {})
  }, [])

  // Pick browser fallback TTS voice
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const pick = () => {
      const vs = window.speechSynthesis.getVoices()
      bestVoiceRef.current = vs.find(v => v.lang.startsWith('en-IN')) || vs.find(v => v.lang.startsWith('en-')) || vs[0] || null
    }
    pick()
    window.speechSynthesis.onvoiceschanged = pick
    return () => { if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null }
  }, [])

  // MediaRecorder is available on all modern browsers
  useEffect(() => { setMicSupported(typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia) }, [])

  // Smart scroll — always anchor to bottom when new messages arrive if already at bottom
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, transcript, isProcessing])

  // ── Trigger from dock / menu bar ───────────────────────────────────────
  useEffect(() => {
    if (trigger && trigger > 0) {
      if (expanded) closePanel(); else openPanel()
    }
  }, [trigger])

  // ── Keyboard shortcuts ─────────────────────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expanded) closePanel()
    }
    window.addEventListener('keydown', down, true)
    return () => window.removeEventListener('keydown', down, true)
  }, [expanded])

  const openPanel = useCallback(() => {
    setExpanded(true)
    const istHour = parseInt(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }))
    const g = istHour < 12 ? 'Good morning' : istHour < 17 ? 'Good afternoon' : istHour < 21 ? 'Good evening' : 'Good night'
    const greets = [
      `${g}. Krishna here — what do you need?`,
      `${g}. I'm listening.`,
      `${g}. What's on your mind?`,
      `${g}. All systems operational — go ahead.`,
      `${g}. How can I help?`,
    ]
    const msg = greets[Math.floor(Math.random() * greets.length)]
    setMessages(m => [...m, { role: 'krishna', text: msg, ts: Date.now() }])
    setTimeout(() => speakText(msg), 120)
  }, [])

  // ── STT helpers (MediaRecorder → Faster-Whisper) ──────────────────────
  const stopListening = useCallback(() => {
    listeningRef.current = false
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop() } catch {}
    }
  }, [])

  const closePanel = useCallback(() => {
    setExpanded(false)
    voiceSessionRef.current = false
    stopListening()
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    setGlobal('idle')
    setListening(false)
    setTranscript('')
  }, [stopListening])

  const startListening = useCallback(async () => {
    if (typeof window === 'undefined') return

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      toast.error('Microphone blocked', 'Allow mic access in browser settings')
      return
    }

    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    stopListening()

    listeningRef.current = true
    voiceSessionRef.current = true
    setListening(true)
    setTranscript('')
    setGlobal('listening')

    // ── VAD via AudioContext analyser ──────────────────────────────────
    const audioCtx = new AudioContext()
    const source = audioCtx.createMediaStreamSource(stream)
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 512
    source.connect(analyser)
    const buf = new Uint8Array(analyser.frequencyBinCount)

    // Pick best supported MIME type (Safari needs mp4/aac)
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
      : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4'
      : ''

    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : {})
    recorderRef.current = recorder
    const chunks: Blob[] = []

    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      audioCtx.close()
      // Reset listening state immediately — before any async work
      setListening(false)
      listeningRef.current = false
      if (!chunks.length) { setGlobal('idle'); return }
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
      const fd = new FormData()
      fd.append('audio', blob, 'audio.webm')
      try {
        const res = await fetch('/api/jarvis/stt', { method: 'POST', body: fd })
        if (res.ok) {
          const { transcript: text } = await res.json()
          if (text?.trim()) {
            setTranscript('')
            sendRef.current(text.trim())
            return  // sendToKrishna owns state from here
          }
        }
      } catch {}
      setTranscript('')
      setGlobal('idle')
    }

    recorder.start()

    // Silence detection — stop after 1.8s of silence, minimum 600ms recording
    let lastSoundAt = Date.now()
    const startedAt = Date.now()
    const vadInterval = setInterval(() => {
      if (!listeningRef.current) { clearInterval(vadInterval); return }
      analyser.getByteFrequencyData(buf)
      const avg = buf.reduce((a, b) => a + b, 0) / buf.length
      if (avg > 10) {
        lastSoundAt = Date.now()
        setTranscript('…')
      }
      const silentFor = Date.now() - lastSoundAt
      const recordedFor = Date.now() - startedAt
      if (silentFor > 1800 && recordedFor > 600) {
        clearInterval(vadInterval)
        if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop()
      }
    }, 100)
  }, [stopListening])

  const toggleListening = useCallback(() => {
    if (listeningRef.current) {
      // Stop recording — end voice session
      voiceSessionRef.current = false
      stopListening()
      setListening(false)
      setGlobal('idle')
      setTranscript('')
    } else {
      // If Krishna is speaking, interrupt immediately then start mic
      if (audioStopRef.current) {
        speakingRef.current = false
        audioStopRef.current()
        audioStopRef.current = null
      }
      startListening()
    }
  }, [startListening, stopListening])

  // ── TTS: Edge TTS API → browser fallback. Interruptible via audioStopRef ─
  const speakText = useCallback(async (text: string) => {
    if (muted) { setGlobal('idle'); return }
    if (typeof window === 'undefined') { setGlobal('idle'); return }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    setGlobal('talking')
    speakingRef.current = true

    const cleanText = toSpeech(text)
    let usedPremium = false

    try {
      const res = await fetch('/api/jarvis/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText, voice: ttsVoiceRef.current }),
        signal: AbortSignal.timeout(14000),
      })
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer()
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
        await new Promise<void>((resolve) => {
          const source = audioCtx.createBufferSource()
          source.buffer = audioBuffer
          source.connect(audioCtx.destination)
          let done = false
          const finish = () => {
            if (done) return; done = true
            audioStopRef.current = null
            audioCtx.close().catch(() => {})
            resolve()
          }
          // Store stop handle so mic click can interrupt immediately
          audioStopRef.current = () => { try { source.stop() } catch {} finish() }
          source.onended = finish
          setTimeout(finish, audioBuffer.duration * 1000 + 2000)
          source.start(0)
        })
        usedPremium = true
      }
    } catch (e) {
      console.warn('[TTS] API failed, falling back to browser TTS:', e)
    }

    // Fallback: browser TTS sentence-by-sentence
    if (!usedPremium && 'speechSynthesis' in window) {
      for (const sentence of toSentences(cleanText)) {
        if (!speakingRef.current) break
        await new Promise<void>((resolve) => {
          const u = new SpeechSynthesisUtterance(sentence)
          if (bestVoiceRef.current) u.voice = bestVoiceRef.current
          u.rate = 0.9; u.pitch = 0.88; u.volume = 1.0
          let done = false
          const finish = () => { if (!done) { done = true; audioStopRef.current = null; resolve() } }
          audioStopRef.current = () => { window.speechSynthesis.cancel(); finish() }
          u.onend = finish; u.onerror = finish
          setTimeout(finish, sentence.length * 80 + 1500)
          window.speechSynthesis.speak(u)
        })
      }
      audioStopRef.current = null
    }

    speakingRef.current = false
    setGlobal('idle')

    // Auto-restart mic for voice conversations
    if (voiceSessionRef.current && !listeningRef.current) {
      setTimeout(() => {
        if (voiceSessionRef.current && !listeningRef.current) startListening()
      }, 350)
    }
  }, [muted, startListening])

  // ── Send message to Krishna API ────────────────────────────────────────
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
      setIsProcessing(false)  // unlock mic before TTS so user can interrupt

      // Handle OS actions
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
      setGlobal('idle')
    }
  }, [activeWindowName, windows, isProcessing, openWindow, speakText])

  // Keep sendRef pointing at the latest sendToKrishna (avoids stale closure in STT)
  useEffect(() => { sendRef.current = sendToKrishna }, [sendToKrishna])

  const handleTextSend = () => {
    const text = inputText.trim()
    if (!text) return
    sendToKrishna(text)
  }

  const stateLabel = listening ? '· listening…' : isProcessing ? '· thinking…' : gState === 'talking' ? '· speaking…' : micSupported ? '· click mic to speak' : '· type to chat'

  const stateColor = listening ? '#FF3B30' : isProcessing ? '#0A84FF' : gState === 'talking' ? '#34C759' : '#5856D6'

  return (
    <AnimatePresence>
      {expanded && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="fixed z-[9900] w-[420px] flex flex-col rounded-2xl overflow-hidden"
          style={{
            bottom: '90px', right: '20px',
            maxHeight: '70vh',
            background: 'rgba(8,8,10,0.94)',
            backdropFilter: 'blur(40px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(88,86,214,0.15)',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-white/[0.05]">
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{ background: stateColor, boxShadow: `0 0 8px ${stateColor}` }}
              animate={{ scale: listening ? [1, 1.3, 1] : 1 }}
              transition={{ duration: 0.7, repeat: listening ? Infinity : 0 }}
            />
            <span className="font-display text-xs text-white/80 tracking-wider">KRISHNA</span>
            <span className="text-[9px] text-white/30">{stateLabel}</span>
            <div className="ml-auto flex items-center gap-1">
              <button onClick={() => setMuted(m => !m)} className="text-white/30 hover:text-white/70 p-1 transition-colors" title={muted ? 'Unmute' : 'Mute'}>
                {muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
              </button>
              <button onClick={closePanel} className="text-white/30 hover:text-white/70 p-1 transition-colors">
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Messages — scrollable area */}
          <MessageScroller ref={scrollRef}>
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-600/30 flex items-center justify-center text-sm font-display text-white/60">K</div>
                <p className="text-center text-[11px] text-white/25 leading-relaxed">
                  {micSupported ? 'Click the mic or type below\nto talk to Krishna.' : 'Type a message to talk to Krishna.'}
                </p>
              </div>
            )}

            {messages.map((m, i) => {
              const isKrishna = m.role === 'krishna'
              const prevSameRole = i > 0 && messages[i - 1].role === m.role
              const nextSameRole = i < messages.length - 1 && messages[i + 1].role === m.role
              return (
                <Message key={i} isKrishna={isKrishna}>
                  {/* Krishna avatar — only on last message in a group */}
                  {isKrishna && (
                    <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-display text-white/80 ${
                      nextSameRole ? 'opacity-0' : 'opacity-100'
                    }`}
                    style={{ background: 'linear-gradient(135deg, #5856D6 0%, #3634A3 100%)', boxShadow: '0 2px 8px rgba(88,86,214,0.4)' }}
                    >
                      K
                    </div>
                  )}

                  <Bubble 
                    isKrishna={isKrishna} 
                    prevSameRole={prevSameRole} 
                    nextSameRole={nextSameRole}
                  >
                    {m.text}
                  </Bubble>
                </Message>
              )
            })}

            {/* Live transcript — ghost bubble */}
            {listening && transcript && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-end"
              >
                <div
                  className="max-w-[78%] px-3 py-2 rounded-2xl rounded-br-sm text-[12px] italic text-white/35"
                  style={{ background: 'rgba(255,59,48,0.08)', border: '0.5px solid rgba(255,59,48,0.15)' }}
                >
                  {transcript}
                </div>
              </motion.div>
            )}

            {/* Typing indicator */}
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-end gap-2"
              >
                <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-display text-white/80"
                  style={{ background: 'linear-gradient(135deg, #5856D6 0%, #3634A3 100%)', boxShadow: '0 2px 8px rgba(88,86,214,0.4)' }}
                >
                  K
                </div>
                <div className="px-3 py-2.5 rounded-2xl rounded-bl-sm"
                  style={{ background: 'rgba(88,86,214,0.15)', border: '0.5px solid rgba(88,86,214,0.2)' }}
                >
                  <div className="flex gap-1 items-center">
                    {[0, 0.18, 0.36].map((delay) => (
                      <motion.div
                        key={delay}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: '#8B89E8' }}
                        animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                        transition={{ duration: 1.1, repeat: Infinity, delay, ease: 'easeInOut' }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </MessageScroller>

          {/* Listening bar */}
          {listening && (
            <motion.div
              initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
              className="px-4 py-2 flex items-center justify-center gap-2 bg-red-500/8 border-t border-red-500/10"
            >
              {[0, 0.1, 0.2, 0.1, 0].map((d, i) => (
                <motion.div key={i} animate={{ scaleY: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.7, repeat: Infinity, delay: d }}
                  className="w-0.5 rounded-full bg-red-400" style={{ height: 16, transformOrigin: 'center' }} />
              ))}
              <span className="text-[10px] text-red-400 ml-1">Listening — click mic to send</span>
            </motion.div>
          )}

          {/* Input row */}
          <div className="px-3 pb-3 pt-2 flex items-end gap-2 border-t border-white/[0.05]">
            {/* Mic toggle */}
            {micSupported && (
              <button
                onClick={toggleListening}
                disabled={isProcessing && !speakingRef.current}
                title={listening ? 'Stop recording' : speakingRef.current ? 'Interrupt Krishna' : 'Start listening'}
                className={`shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition-all ${
                  listening
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                    : 'bg-white/10 text-white/50 hover:bg-white/15 hover:text-white/80'
                }`}
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}

            <textarea
              ref={inputRef}
              className="flex-1 bg-white/[0.05] border border-white/[0.07] rounded-xl px-3 py-2 text-[12px] text-white/85 placeholder:text-white/20 outline-none resize-none leading-relaxed"
              placeholder={isProcessing ? 'Krishna is responding…' : 'Type a message…'}
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
              className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center bg-purple-600/70 text-white disabled:opacity-30 hover:bg-purple-600 transition-all"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
