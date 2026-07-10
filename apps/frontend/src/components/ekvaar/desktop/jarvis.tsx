'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Volume2, VolumeX, Mic, MicOff, Send } from 'lucide-react'
import { useWindowStore } from '@/lib/window-store'
import { APPS } from './app-registry'
import { toast } from './toast'

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

  const recognitionRef = useRef<any>(null)
  const listeningRef = useRef(false)               // ref mirror of listening state
  const voiceSessionRef = useRef(false)            // true = user started a voice conversation
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sendRef = useRef<(text: string) => void>(() => {})   // always-fresh sendToKrishna ref
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const bestVoiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const activeWindowName = activeId ? APPS.find(a => a.id === activeId)?.name || activeId : null

  // ── Pick best available TTS voice ──────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const pick = () => {
      const vs = window.speechSynthesis.getVoices()
      if (!vs.length) return
      // Male voice priority — Jarvis-like deep English voice
      const malePriority = [
        'Google UK English Male', 'Microsoft Guy Online',
        'Microsoft David Online', 'Microsoft David',
        'Daniel', 'Oliver', 'Arthur', 'Fred',
        'Google US English', 'Microsoft Zira Online',
      ]
      for (const name of malePriority) {
        const m = vs.find(v => v.name.includes(name) && v.lang.startsWith('en'))
        if (m) { bestVoiceRef.current = m; return }
      }
      // Fallback: any English male-sounding voice, then any English voice
      bestVoiceRef.current = vs.find(v => v.lang.startsWith('en-GB')) || vs.find(v => v.lang.startsWith('en-')) || vs[0]
    }
    pick()
    window.speechSynthesis.onvoiceschanged = pick
    return () => { if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null }
  }, [])

  useEffect(() => {
    const SR = typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    setMicSupported(!!SR)
  }, [])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, transcript])

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
      `${g}, Founder. Krishna here — how can I help?`,
      `${g}, Sir. I'm listening.`,
      `${g}, Founder. At your service.`,
      `${g}. All systems operational.`,
    ]
    const msg = greets[Math.floor(Math.random() * greets.length)]
    setMessages(m => [...m, { role: 'krishna', text: msg, ts: Date.now() }])
    setTimeout(() => speakText(msg), 120)
  }, [])

  // ── STT helpers ────────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    listeningRef.current = false
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
    if (recognitionRef.current) {
      const rec = recognitionRef.current
      recognitionRef.current = null
      try { rec.abort() } catch {}
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

  // One recognition "session" — continuous: false + manual restart in onend
  const spawnRec = useCallback((accumulated: { text: string }) => {
    if (typeof window === 'undefined') return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR || !listeningRef.current) return

    const rec = new SR()
    rec.continuous = false      // single-utterance — most reliable in Chrome
    rec.interimResults = true
    rec.lang = 'en-IN'
    rec.maxAlternatives = 1
    recognitionRef.current = rec

    rec.onresult = (event: any) => {
      let interim = ''
      for (let i = 0; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) accumulated.text += t
        else interim += t
      }
      setTranscript(accumulated.text + interim)

      // Reset silence timer each time we hear something
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      const snapshot = accumulated.text + interim
      silenceTimerRef.current = setTimeout(() => {
        if (!snapshot.trim()) return
        const final = snapshot.trim()
        stopListening()
        setListening(false)
        setGlobal('idle')
        setTranscript('')
        sendRef.current(final)
      }, 2200)
    }

    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        listeningRef.current = false
        recognitionRef.current = null
        toast.error('Microphone blocked', 'Allow mic access in browser settings')
        setListening(false); setGlobal('idle')
      }
      // no-speech / aborted / network → let onend restart
    }

    rec.onend = () => {
      if (!listeningRef.current || recognitionRef.current !== rec) return
      recognitionRef.current = null
      // Brief gap then restart so Chrome doesn't rate-limit
      setTimeout(() => spawnRec(accumulated), 80)
    }

    try { rec.start() } catch {}
  // spawnRec references itself via setTimeout — intentionally excluded from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopListening])

  const startListening = useCallback(async () => {
    if (typeof window === 'undefined') return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { toast.error('Mic not supported', 'Use Chrome or Edge for voice'); return }

    // Explicitly request mic permission first — clears any stale blocked state
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(t => t.stop())   // we only needed the permission grant
    } catch (err: any) {
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

    spawnRec({ text: '' })
  }, [stopListening, spawnRec])

  const toggleListening = useCallback(() => {
    if (listeningRef.current) {
      // Manual stop — end voice session
      voiceSessionRef.current = false
      const text = transcript.trim()
      stopListening()
      setListening(false)
      setGlobal('idle')
      setTranscript('')
      if (text) sendRef.current(text)
    } else {
      startListening()
    }
  }, [transcript, startListening, stopListening])

  // ── TTS — sentence-by-sentence, then auto-restart mic ─────────────────
  const speakText = useCallback(async (text: string) => {
    if (muted) { setGlobal('idle'); return }
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) { setGlobal('idle'); return }
    window.speechSynthesis.cancel()
    setGlobal('talking')

    const sentences = toSentences(toSpeech(text))

    for (const sentence of sentences) {
      if (gState !== 'talking') break
      await new Promise<void>((resolve) => {
        const u = new SpeechSynthesisUtterance(sentence)
        if (bestVoiceRef.current) u.voice = bestVoiceRef.current
        u.rate = 0.92   // slightly slower — Jarvis-style deliberate pacing
        u.pitch = 0.9   // lower pitch = deeper/more masculine
        u.volume = 1.0
        let done = false
        const finish = () => { if (!done) { done = true; resolve() } }
        u.onend = finish
        u.onerror = finish
        setTimeout(finish, sentence.length * 75 + 1500)
        window.speechSynthesis.speak(u)
      })
    }
    setGlobal('idle')

    // Auto-restart mic if this was a voice conversation (user clicked mic first)
    if (voiceSessionRef.current && !listeningRef.current) {
      setTimeout(() => {
        if (voiceSessionRef.current && !listeningRef.current) {
          listeningRef.current = true
          setListening(true)
          setTranscript('')
          setGlobal('listening')
          spawnRec({ text: '' })
        }
      }, 350)
    }
  }, [muted, spawnRec])

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
      const reply = data.spoken || "I'm here, Founder."
      setMessages(prev => [...prev, { role: 'krishna', text: reply, ts: Date.now() }])

      // Handle actions
      if (data.action?.type === 'open_app') {
        const app = APPS.find(a =>
          a.id === data.action.app ||
          a.name.toLowerCase().includes((data.action.app || '').toLowerCase()) ||
          a.shortName.toLowerCase().includes((data.action.app || '').toLowerCase())
        )
        if (app) openWindow(app.id, app.name)
      }

      await speakText(reply)
    } catch {
      const fallback = "I'm here, Founder. How can I assist?"
      setMessages(prev => [...prev, { role: 'krishna', text: fallback, ts: Date.now() }])
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
          className="fixed z-[9900] w-[400px] rounded-2xl overflow-hidden"
          style={{
            bottom: '90px', right: '20px',
            background: 'rgba(8,8,10,0.92)',
            backdropFilter: 'blur(40px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
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

          {/* Messages */}
          <div className="max-h-56 min-h-[64px] overflow-y-auto px-4 py-3 space-y-2.5">
            {messages.length === 0 && (
              <div className="text-center py-4 text-[11px] text-white/25">
                {micSupported ? 'Click the mic or type below to talk to Krishna.' : 'Type a message to talk to Krishna.'}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'krishna' && (
                  <div className="w-5 h-5 rounded-full bg-purple-600/40 flex items-center justify-center text-[9px] text-white/70 mr-1.5 mt-0.5 shrink-0">K</div>
                )}
                <div className={`max-w-[82%] rounded-xl px-3 py-2 text-[11px] leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-white/12 text-white/90 rounded-tr-sm'
                    : 'bg-purple-900/30 text-white/75 border border-purple-500/10 rounded-tl-sm'
                }`}>{m.text}</div>
              </div>
            ))}

            {/* Live transcript */}
            {listening && transcript && (
              <div className="flex justify-end">
                <div className="max-w-[82%] rounded-xl px-3 py-2 text-[11px] bg-red-900/20 text-white/40 italic border border-red-500/10">
                  {transcript}
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="flex justify-start">
                <div className="w-5 h-5 rounded-full bg-purple-600/40 flex items-center justify-center text-[9px] text-white/70 mr-1.5 mt-0.5 shrink-0">K</div>
                <div className="px-3 py-2 rounded-xl bg-purple-900/30 border border-purple-500/10">
                  <div className="flex gap-1 items-center">
                    <motion.div animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }} className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    <motion.div animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    <motion.div animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

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
                disabled={isProcessing}
                title={listening ? 'Stop & send' : 'Start listening'}
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
