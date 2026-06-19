'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Volume2, VolumeX, X, Loader2 } from 'lucide-react'
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
  const { open: openWindow } = useWindowStore()
  const [isOpen, setIsOpen] = useState(false)
  const [state, setState] = useState<JarvisState>('idle')
  const [messages, setMessages] = useState<JarvisMessage[]>([])
  const [transcript, setTranscript] = useState('')
  const [muted, setMuted] = useState(false)
  const [orbVisible, setOrbVisible] = useState(true)

  const recognitionRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Keyboard shortcut: Cmd+Space (Mac) or Ctrl+Space (Windows)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.code === 'Space') {
        e.preventDefault()
        e.stopPropagation()
        setIsOpen((v) => !v)
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
        stopListening()
      }
    }
    window.addEventListener('keydown', handler, true) // capture phase
    return () => window.removeEventListener('keydown', handler, true)
  }, [isOpen])

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initialize speech recognition
  const initRecognition = useCallback(() => {
    if (typeof window === 'undefined') return null
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return null

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      let final = ''
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) final += transcript
        else interim += transcript
      }
      setTranscript(final + interim)
      if (final) {
        sendToJarvis(final)
      }
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setState('idle')
      if (event.error === 'not-allowed') {
        toast.error('Microphone blocked', 'Please allow microphone access for voice input')
      }
    }

    recognition.onend = () => {
      if (state === 'listening') {
        setState('idle')
      }
    }

    return recognition
  }, [state])

  const startListening = () => {
    if (state === 'listening') {
      stopListening()
      return
    }
    const recognition = initRecognition()
    if (!recognition) {
      toast.error('Voice not supported', 'Your browser does not support speech recognition. Try Chrome or Edge.')
      return
    }
    recognitionRef.current = recognition
    setTranscript('')
    setState('listening')
    try {
      recognition.start()
    } catch (e) {
      // Already started
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
      recognitionRef.current = null
    }
    if (state === 'listening') setState('idle')
  }

  // Send message to Jarvis (Krishna CEO)
  const sendToJarvis = async (text: string) => {
    if (!text.trim()) return

    const userMsg: JarvisMessage = { role: 'user', text, ts: Date.now() }
    setMessages((prev) => [...prev, userMsg])
    setTranscript('')
    setState('thinking')

    try {
      const r = await fetch('/api/jarvis/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context: `Open windows: none. Time: ${new Date().toLocaleString()}`,
        }),
      })
      if (!r.ok) throw new Error('Failed')
      const data = await r.json()

      const jarvisMsg: JarvisMessage = { role: 'jarvis', text: data.spoken, ts: Date.now() }
      setMessages((prev) => [...prev, jarvisMsg])

      // Execute action if any
      if (data.action && data.action.type === 'open_app') {
        const app = APPS.find((a) =>
          a.id === data.action.app ||
          a.name.toLowerCase().includes(data.action.app?.toLowerCase()) ||
          a.shortName.toLowerCase().includes(data.action.app?.toLowerCase())
        )
        if (app) {
          openWindow(app.id, app.name)
          toast.info('Krishna', `Opening ${app.name}`)
        }
      }

      // Speak the response
      if (!muted && data.spoken) {
        await speak(data.spoken)
      } else {
        setState('idle')
      }
    } catch (e) {
      const errorMsg: JarvisMessage = {
        role: 'jarvis',
        text: "I'm here, Founder. All systems operational. How can I assist?",
        ts: Date.now(),
      }
      setMessages((prev) => [...prev, errorMsg])
      if (!muted) await speak(errorMsg.text)
      else setState('idle')
    }
  }

  // Text-to-speech via API
  const speak = async (text: string) => {
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

      if (audioRef.current) {
        audioRef.current.src = url
        audioRef.current.onended = () => {
          setState('idle')
          URL.revokeObjectURL(url)
        }
        audioRef.current.onerror = () => setState('idle')
        await audioRef.current.play()
      }
    } catch {
      // Fallback to browser TTS
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = 0.95
        utterance.pitch = 0.9
        utterance.onend = () => setState('idle')
        utterance.onerror = () => setState('idle')
        window.speechSynthesis.speak(utterance)
      } else {
        setState('idle')
      }
    }
  }

  // Handle text input (for typing instead of voice)
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
      {/* Desktop Orb — always visible on wallpaper */}
      <AnimatePresence>
        {orbVisible && !isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-24 right-6 z-[8500] group"
            title="Krishna (JARVIS) — Press ⌘+Space"
          >
            <JarvisOrb state={state} size={64} />
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-white/40 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              Krishna · ⌘+Space
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Hidden audio element for TTS playback */}
      <audio ref={audioRef} className="hidden" />

      {/* Jarvis Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed bottom-20 right-6 z-[9700] w-96 rounded-2xl overflow-hidden border border-white/15"
            style={{
              background: 'rgba(15, 15, 17, 0.92)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header with orb */}
            <div className="flex items-center gap-3 p-4 border-b border-white/10">
              <JarvisOrb state={state} size={40} />
              <div className="flex-1">
                <div className="font-display text-sm tracking-tight text-white">Krishna</div>
                <div className="text-[10px] text-white/50">
                  {state === 'idle' && 'Ready · CEO & Central System'}
                  {state === 'listening' && 'Listening...'}
                  {state === 'thinking' && 'Processing...'}
                  {state === 'talking' && 'Speaking...'}
                </div>
              </div>
              <button
                onClick={() => setMuted(!muted)}
                className="text-white/40 hover:text-white/80 transition-colors p-1"
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <button
                onClick={() => { setIsOpen(false); stopListening() }}
                className="text-white/40 hover:text-white/80 transition-colors p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="max-h-64 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-6">
                  <div className="text-xs text-white/40 mb-2">
                    I'm Krishna — your CEO and central system.
                  </div>
                  <div className="text-[10px] text-white/30">
                    Tap the mic and speak, or type below.<br/>
                    Try: "Open finance" or "What's our revenue?"
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${
                      m.role === 'user'
                        ? 'bg-white/15 text-white/90'
                        : 'bg-white/5 text-white/80 border border-white/10'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {/* Live transcript while listening */}
              {state === 'listening' && transcript && (
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-lg px-3 py-2 text-xs bg-white/10 text-white/50 italic">
                    {transcript}...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="p-3 border-t border-white/10 flex items-center gap-2">
              <button
                onClick={startListening}
                className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-all ${
                  state === 'listening'
                    ? 'bg-agni text-white animate-pulse'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
                title={state === 'listening' ? 'Stop listening' : 'Start listening'}
              >
                {state === 'listening' ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <textarea
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/90 placeholder:text-white/30 outline-none resize-none"
                placeholder="Type to Krishna or use mic..."
                rows={1}
                onKeyDown={handleKeyDown}
                disabled={state === 'thinking' || state === 'talking'}
              />
              {state === 'thinking' && <Loader2 className="h-4 w-4 text-white/50 animate-spin flex-shrink-0" />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// Visual Orb — animated based on state
function JarvisOrb({ state, size = 64 }: { state: JarvisState; size?: number }) {
  const colors = {
    idle: { primary: '#5856D6', secondary: '#3634A3', glow: 'rgba(88, 86, 214, 0.4)' },
    listening: { primary: '#FF3B30', secondary: '#C8302A', glow: 'rgba(255, 59, 48, 0.5)' },
    thinking: { primary: '#FF9500', secondary: '#E07B00', glow: 'rgba(255, 149, 0, 0.5)' },
    talking: { primary: '#34C759', secondary: '#2EB14E', glow: 'rgba(52, 199, 89, 0.5)' },
  }
  const c = colors[state]

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Outer glow */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          scale: state === 'idle' ? [1, 1.15, 1] : state === 'listening' ? [1, 1.3, 1] : state === 'talking' ? [1, 1.2, 1] : [1, 1.1, 1],
          opacity: state === 'idle' ? [0.3, 0.5, 0.3] : [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: state === 'idle' ? 3 : state === 'listening' ? 1 : 0.6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          background: `radial-gradient(circle, ${c.glow} 0%, transparent 70%)`,
        }}
      />

      {/* Pulsing rings when listening */}
      {state === 'listening' && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full border-2"
            animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
            style={{ borderColor: c.primary }}
          />
          <motion.div
            className="absolute inset-0 rounded-full border-2"
            animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
            style={{ borderColor: c.primary }}
          />
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
              animate={{ height: [size * 0.15, size * 0.5, size * 0.15] }}
              transition={{
                duration: 0.3,
                repeat: Infinity,
                delay: i * 0.06,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      )}

      {/* Thinking spinner */}
      {state === 'thinking' && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          style={{ borderColor: c.primary, borderTopColor: 'transparent' }}
        />
      )}

      {/* Core orb */}
      <motion.div
        className="absolute rounded-full flex items-center justify-center overflow-hidden"
        style={{
          inset: size * 0.15,
          background: `linear-gradient(135deg, ${c.primary} 0%, ${c.secondary} 100%)`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 8px ${c.glow}`,
        }}
        animate={{
          scale: state === 'idle' ? 1 : state === 'listening' ? [1, 1.05, 1] : 1,
        }}
        transition={{ duration: 1, repeat: state === 'listening' ? Infinity : 0 }}
      >
        {/* Inner gradient swirl */}
        <motion.div
          className="absolute inset-0 opacity-50"
          animate={{ rotate: 360 }}
          transition={{ duration: state === 'idle' ? 20 : 4, repeat: Infinity, ease: 'linear' }}
          style={{
            background: `conic-gradient(from 0deg, transparent, ${c.primary}, transparent, ${c.secondary}, transparent)`,
          }}
        />
        {/* Center letter */}
        <span className="relative font-display text-white/90" style={{ fontSize: size * 0.28 }}>
          K
        </span>
      </motion.div>
    </div>
  )
}
