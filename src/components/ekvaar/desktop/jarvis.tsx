'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, X, Loader2, Volume2, VolumeX } from 'lucide-react'
import { useWindowStore } from '@/lib/window-store'
import { APPS } from './app-registry'
import { toast } from './toast'

type JarvisState = 'idle' | 'listening' | 'thinking' | 'talking'

interface JarvisMessage {
  role: 'user' | 'jarvis'
  text: string
  ts: number
}

export function Jarvis() {
  const { open: openWindow, activeId, windows } = useWindowStore()
  const [expanded, setExpanded] = useState(false)
  const [state, setState] = useState<JarvisState>('idle')
  const [messages, setMessages] = useState<JarvisMessage[]>([])
  const [transcript, setTranscript] = useState('')
  const [muted, setMuted] = useState(false)
  const [continuousMode, setContinuousMode] = useState(false)

  const recognitionRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const continuousTimerRef = useRef<number | null>(null)
  const isMountedRef = useRef(true)

  // Track active window for screen context
  const activeWindowName = activeId ? APPS.find(a => a.id === activeId)?.name || activeId : null

  // Keyboard shortcut: Cmd+Space / Ctrl+Space
  useEffect(() => {
    isMountedRef.current = true
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.code === 'Space') {
        e.preventDefault()
        e.stopPropagation()
        wakeUp()
      }
      if (e.key === 'Escape' && expanded) {
        setExpanded(false)
        setContinuousMode(false)
        stopListening()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => {
      window.removeEventListener('keydown', handler, true)
      isMountedRef.current = false
      stopListening()
    }
  }, [expanded])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Wake up — greet and auto-listen
  const wakeUp = useCallback(() => {
    setExpanded((prev) => {
      if (!prev) {
        // First open — greet
        const greetings = [
          "Hello, Founder. Krishna here. How can I help?",
          "Yes, Sir. I'm listening.",
          "At your service, Founder. What do you need?",
          "Krishna online. All systems operational. Speak to me.",
        ]
        const greeting = greetings[Math.floor(Math.random() * greetings.length)]
        const msg: JarvisMessage = { role: 'jarvis', text: greeting, ts: Date.now() }
        setMessages((m) => [...m, msg])
        if (!muted) speak(greeting, true) // speak greeting, then auto-listen
        else {
          // Even if muted, start listening after a brief moment
          setTimeout(() => startListening(), 300)
        }
        return true
      }
      // Already open — toggle closed
      setContinuousMode(false)
      stopListening()
      return false
    })
  }, [muted])

  // Speech recognition
  const initRecognition = useCallback(() => {
    if (typeof window === 'undefined') return null
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return null

    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      let final = ''
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) final += t
        else interim += t
      }
      setTranscript(final + interim)
      if (final.trim()) {
        sendToJarvis(final.trim())
      }
    }

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        // Silent — just go back to idle
        if (isMountedRef.current) setState('idle')
        return
      }
      if (event.error === 'not-allowed') {
        toast.error('Microphone blocked', 'Please allow mic access in your browser settings')
        setContinuousMode(false)
      }
      if (isMountedRef.current) setState('idle')
    }

    recognition.onend = () => {
      if (!isMountedRef.current) return
      // If in continuous mode and still expanded, restart listening after a brief pause
      if (continuousModeRef.current && expandedRef.current && state !== 'thinking' && state !== 'talking') {
        continuousTimerRef.current = window.setTimeout(() => {
          if (isMountedRef.current && continuousModeRef.current) {
            try { recognition.start() } catch {}
          }
        }, 500)
      } else {
        setState('idle')
      }
    }

    return recognition
  }, [])

  // Refs to track state in callbacks
  const continuousModeRef = useRef(false)
  const expandedRef = useRef(false)
  const stateRef = useRef<JarvisState>('idle')

  useEffect(() => { continuousModeRef.current = continuousMode }, [continuousMode])
  useEffect(() => { expandedRef.current = expanded }, [expanded])
  useEffect(() => { stateRef.current = state }, [state])

  const startListening = useCallback(() => {
    if (stateRef.current === 'listening') return
    const recognition = initRecognition()
    if (!recognition) {
      toast.error('Voice not supported', 'Use Chrome or Edge for voice input. You can still type.')
      return
    }
    recognitionRef.current = recognition
    setTranscript('')
    setState('listening')
    try { recognition.start() } catch {}
  }, [initRecognition])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
      recognitionRef.current = null
    }
    if (continuousTimerRef.current) {
      clearTimeout(continuousTimerRef.current)
      continuousTimerRef.current = null
    }
    if (isMountedRef.current && stateRef.current === 'listening') {
      setState('idle')
    }
  }, [])

  // Send to Krishna
  const sendToJarvis = useCallback(async (text: string) => {
    if (!text.trim()) return

    const userMsg: JarvisMessage = { role: 'user', text, ts: Date.now() }
    setMessages((prev) => [...prev, userMsg])
    setTranscript('')
    setState('thinking')
    stopListening()

    try {
      const r = await fetch('/api/jarvis/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context: `Active window: ${activeWindowName || 'none'}. Open windows: ${windows.length}.`,
          activeWindow: activeWindowName,
        }),
      })
      if (!r.ok) throw new Error('Failed')
      const data = await r.json()

      const jarvisMsg: JarvisMessage = { role: 'jarvis', text: data.spoken, ts: Date.now() }
      setMessages((prev) => [...prev, jarvisMsg])

      // Execute UI actions
      if (data.action && data.action.type === 'open_app') {
        const app = APPS.find(a =>
          a.id === data.action.app ||
          a.name.toLowerCase().includes(data.action.app?.toLowerCase()) ||
          a.shortName.toLowerCase().includes(data.action.app?.toLowerCase())
        )
        if (app) {
          openWindow(app.id, app.name)
        }
      }

      // Speak response
      if (!muted && data.spoken) {
        await speak(data.spoken)
      } else {
        setState('idle')
        // Auto-listen after response in continuous mode
        if (continuousModeRef.current) {
          setTimeout(() => startListening(), 400)
        }
      }
    } catch {
      const fallback = "I'm here, Founder. How can I assist?"
      const msg: JarvisMessage = { role: 'jarvis', text: fallback, ts: Date.now() }
      setMessages((prev) => [...prev, msg])
      if (!muted) await speak(fallback)
      else {
        setState('idle')
        if (continuousModeRef.current) setTimeout(() => startListening(), 400)
      }
    }
  }, [activeWindowName, windows, muted, openWindow, startListening, stopListening])

  // TTS — speak and auto-listen after
  const speak = useCallback(async (text: string, isGreeting = false) => {
    setState('talking')
    try {
      const r = await fetch('/api/jarvis/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!r.ok) throw new Error('TTS failed')

      const blob = await r.blob()
      const url = URL.createObjectURL(blob)

      await new Promise<void>((resolve) => {
        if (audioRef.current) {
          audioRef.current.src = url
          audioRef.current.onended = () => {
            URL.revokeObjectURL(url)
            resolve()
          }
          audioRef.current.onerror = () => { URL.revokeObjectURL(url); resolve() }
          audioRef.current.play().catch(() => resolve())
        } else {
          resolve()
        }
      })
    } catch {
      // Fallback to browser TTS
      if ('speechSynthesis' in window) {
        await new Promise<void>((resolve) => {
          const u = new SpeechSynthesisUtterance(text)
          u.rate = 1.05
          u.pitch = 0.85
          u.onend = () => resolve()
          u.onerror = () => resolve()
          window.speechSynthesis.speak(u)
        })
      }
    }

    if (!isMountedRef.current) return
    setState('idle')

    // Auto-listen after speaking (continuous conversation)
    if (expandedRef.current) {
      setContinuousMode(true)
      setTimeout(() => {
        if (isMountedRef.current && expandedRef.current) {
          startListening()
        }
      }, 300)
    }
  }, [startListening])

  // Text input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const target = e.target as HTMLTextAreaElement
      if (target.value.trim()) {
        sendToJarvis(target.value.trim())
        target.value = ''
      }
    }
  }

  return (
    <>
      {/* Living orb embedded in wallpaper — always visible */}
      <div className="fixed bottom-24 right-8 z-[8500] pointer-events-none">
        <motion.div
          className="pointer-events-auto"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 1, type: 'spring' }}
        >
          <JarvisOrb state={state} size={expanded ? 48 : 64} onClick={() => wakeUp()} />
        </motion.div>
      </div>

      {/* Hidden audio */}
      <audio ref={audioRef} className="hidden" />

      {/* Expanded conversation — grows from orb location, NOT a separate popup */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed bottom-20 right-6 z-[9700] w-[380px] rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(10, 10, 12, 0.88)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 80px ${state === 'listening' ? 'rgba(255,59,48,0.15)' : state === 'talking' ? 'rgba(52,199,89,0.15)' : 'rgba(88,86,214,0.1)'}`,
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {/* Header — minimal, integrated */}
            <div className="flex items-center gap-2 px-4 pt-3 pb-2">
              <div className="w-2 h-2 rounded-full" style={{
                background: state === 'idle' ? '#5856D6' : state === 'listening' ? '#FF3B30' : state === 'thinking' ? '#FF9500' : '#34C759',
                boxShadow: `0 0 8px ${state === 'idle' ? '#5856D6' : state === 'listening' ? '#FF3B30' : state === 'thinking' ? '#FF9500' : '#34C759'}`,
              }} />
              <span className="font-display text-xs text-white/80 tracking-tight">Krishna</span>
              <span className="text-[9px] text-white/30">
                {state === 'idle' && (continuousMode ? '· listening mode' : '· ready')}
                {state === 'listening' && '· listening...'}
                {state === 'thinking' && '· thinking...'}
                {state === 'talking' && '· speaking...'}
              </span>
              <div className="ml-auto flex items-center gap-1">
                <button
                  onClick={() => setMuted(!muted)}
                  className="text-white/30 hover:text-white/60 transition-colors p-1"
                  title={muted ? 'Unmute voice' : 'Mute voice'}
                >
                  {muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                </button>
                <button
                  onClick={() => { setExpanded(false); setContinuousMode(false); stopListening() }}
                  className="text-white/30 hover:text-white/60 transition-colors p-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="max-h-56 min-h-[80px] overflow-y-auto px-4 py-2 space-y-2.5">
              {messages.length === 0 && (
                <div className="text-center py-4 text-[10px] text-white/30">
                  Speak or type to Krishna...
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-[11px] leading-relaxed ${
                    m.role === 'user' ? 'bg-white/15 text-white/90' : 'bg-white/5 text-white/70 border border-white/5'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {/* Live transcript */}
              {state === 'listening' && transcript && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-lg px-2.5 py-1.5 text-[11px] bg-white/8 text-white/40 italic">
                    {transcript}...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div className="px-3 pb-3 pt-2 flex items-center gap-2 border-t border-white/5">
              <button
                onClick={() => {
                  if (state === 'listening') {
                    stopListening()
                    setContinuousMode(false)
                  } else {
                    setContinuousMode(true)
                    startListening()
                  }
                }}
                className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-all ${
                  state === 'listening'
                    ? 'bg-red-500/80 text-white'
                    : continuousMode
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-white/10 text-white/50 hover:bg-white/15'
                }`}
                title={state === 'listening' ? 'Stop' : continuousMode ? 'Continuous mode on' : 'Start talking'}
              >
                {state === 'listening' ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              </button>
              <textarea
                className="flex-1 bg-white/5 border border-white/8 rounded-lg px-2.5 py-1.5 text-[11px] text-white/80 placeholder:text-white/25 outline-none resize-none"
                placeholder="Type or speak..."
                rows={1}
                onKeyDown={handleKeyDown}
                disabled={state === 'thinking' || state === 'talking'}
              />
              {state === 'thinking' && <Loader2 className="h-3.5 w-3.5 text-white/40 animate-spin flex-shrink-0" />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// Living orb — animated AI organism
function JarvisOrb({ state, size = 64, onClick }: { state: JarvisState; size?: number; onClick: () => void }) {
  const colors = {
    idle: { primary: '#5856D6', secondary: '#3634A3', glow: 'rgba(88, 86, 214, 0.35)' },
    listening: { primary: '#FF3B30', secondary: '#C8302A', glow: 'rgba(255, 59, 48, 0.45)' },
    thinking: { primary: '#FF9500', secondary: '#E07B00', glow: 'rgba(255, 149, 0, 0.45)' },
    talking: { primary: '#34C759', secondary: '#2EB14E', glow: 'rgba(52, 199, 89, 0.45)' },
  }
  const c = colors[state]

  return (
    <motion.button
      onClick={onClick}
      className="relative cursor-pointer"
      style={{ width: size, height: size }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Outer ambient glow — always pulsing (living organism) */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          scale: state === 'idle' ? [1, 1.2, 1] : [1, 1.35, 1],
          opacity: state === 'idle' ? [0.2, 0.4, 0.2] : [0.4, 0.7, 0.4],
        }}
        transition={{
          duration: state === 'idle' ? 4 : state === 'listening' ? 0.8 : 0.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{ background: `radial-gradient(circle, ${c.glow} 0%, transparent 70%)` }}
      />

      {/* Sonar rings when listening */}
      {state === 'listening' && (
        <>
          {[0, 0.5, 1].map((delay) => (
            <motion.div
              key={delay}
              className="absolute inset-0 rounded-full border"
              animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay, ease: 'easeOut' }}
              style={{ borderColor: c.primary }}
            />
          ))}
        </>
      )}

      {/* Sound waves when talking */}
      {state === 'talking' && (
        <div className="absolute inset-0 flex items-center justify-center gap-0.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="w-0.5 rounded-full"
              style={{ background: c.primary }}
              animate={{ height: [size * 0.1, size * 0.5, size * 0.1] }}
              transition={{ duration: 0.25, repeat: Infinity, delay: i * 0.05, ease: 'easeInOut' }}
            />
          ))}
        </div>
      )}

      {/* Thinking spinner */}
      {state === 'thinking' && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
          style={{ borderColor: c.primary, borderTopColor: 'transparent' }}
        />
      )}

      {/* Core orb — living, breathing */}
      <motion.div
        className="absolute rounded-full overflow-hidden flex items-center justify-center"
        style={{
          inset: size * 0.18,
          background: `linear-gradient(135deg, ${c.primary} 0%, ${c.secondary} 100%)`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 12px ${c.glow}`,
        }}
        animate={{
          scale: state === 'idle' ? [1, 1.04, 1] : 1,
        }}
        transition={{ duration: 3, repeat: state === 'idle' ? Infinity : 0, ease: 'easeInOut' }}
      >
        {/* Inner swirling energy — always rotating (alive) */}
        <motion.div
          className="absolute inset-0 opacity-40"
          animate={{ rotate: 360 }}
          transition={{ duration: state === 'idle' ? 15 : 3, repeat: Infinity, ease: 'linear' }}
          style={{
            background: `conic-gradient(from 0deg, transparent, ${c.primary}, transparent 60%, ${c.secondary}, transparent)`,
          }}
        />

        {/* Inner glow pulse */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.3), transparent 60%)` }}
        />

        {/* K letter */}
        <span className="relative font-display text-white/90" style={{ fontSize: size * 0.3 }}>
          K
        </span>
      </motion.div>
    </motion.button>
  )
}
