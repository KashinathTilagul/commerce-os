'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Volume2, VolumeX } from 'lucide-react'
import { useWindowStore } from '@/lib/window-store'
import { APPS } from './app-registry'
import { toast } from './toast'

type JarvisState = 'idle' | 'listening' | 'thinking' | 'talking'

interface JarvisMessage {
  role: 'user' | 'jarvis'
  text: string
  ts: number
}

// Expand acronyms and convert numbers for natural speech
function preprocessForSpeech(text: string): string {
  const expansions: Record<string, string> = {
    'CMO': 'Chief Marketing Officer', 'CTO': 'Chief Technology Officer',
    'CFO': 'Chief Financial Officer', 'COO': 'Chief Operating Officer',
    'CCO': 'Chief Creative Officer', 'CSM': 'Customer Success Manager',
    'CEO': 'Chief Executive Officer', 'ROAS': 'return on ad spend',
    'CAC': 'customer acquisition cost', 'LTV': 'lifetime value',
    'AOV': 'average order value', 'P&L': 'profit and loss',
    'Q3': 'quarter three', 'Q4': 'quarter four', 'Q1': 'quarter one', 'Q2': 'quarter two',
    'API': 'A P I', 'OS': 'operating system', 'AI': 'A I',
    'SKU': 'S K U', 'GSM': 'G S M', '₹': 'rupees ', 'EKVAAR': 'Ekvaar',
  }
  let r = text.replace(/^SPOKEN:\s*/i, '').replace(/[*_#`]/g, '')
  for (const [a, f] of Object.entries(expansions)) {
    r = r.replace(new RegExp(`\\b${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), f)
  }
  r = r.replace(/(\d+\.?\d*)%/g, '$1 percent')
  return r.replace(/\s+/g, ' ').trim()
}

// Globally shared state so the dock orb and the panel stay in sync
let globalJarvisState: JarvisState = 'idle'
const jarvisStateListeners: ((s: JarvisState) => void)[] = []

function setGlobalState(s: JarvisState) {
  globalJarvisState = s
  jarvisStateListeners.forEach(fn => fn(s))
}

// The dock orb — glassmorphism Apple-style, lives INSIDE the dock
export function JarvisDockOrb({ onClick }: { onClick: () => void }) {
  const [state, setState] = useState<JarvisState>(globalJarvisState)

  useEffect(() => {
    const fn = (s: JarvisState) => setState(s)
    jarvisStateListeners.push(fn)
    return () => { const i = jarvisStateListeners.indexOf(fn); if (i >= 0) jarvisStateListeners.splice(i, 1) }
  }, [])

  const colors = {
    idle: { primary: '#5856D6', glow: 'rgba(88,86,214,0.3)' },
    listening: { primary: '#FF3B30', glow: 'rgba(255,59,48,0.4)' },
    thinking: { primary: '#FF9500', glow: 'rgba(255,149,0,0.4)' },
    talking: { primary: '#34C759', glow: 'rgba(52,199,89,0.4)' },
  }
  const c = colors[state]
  const size = 42

  return (
    <motion.button
      onClick={onClick}
      className="relative cursor-pointer flex-shrink-0 mx-0.5"
      style={{ width: size, height: size }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      title="Krishna — Press ⌘+Space or hold Space to talk"
    >
      {/* Glassmorphism background — Apple style */}
      <div
        className="absolute inset-0 rounded-[22%] overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${c.primary}40 0%, ${c.primary}20 100%)`,
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 8px ${c.glow}`,
        }}
      >
        {/* Inner glow */}
        <motion.div
          className="absolute inset-0"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: state === 'idle' ? 4 : 1.5, repeat: Infinity }}
          style={{ background: `radial-gradient(circle at 35% 30%, ${c.primary}50, transparent 70%)` }}
        />
        {/* Swirl */}
        <motion.div
          className="absolute inset-0 opacity-30"
          animate={{ rotate: 360 }}
          transition={{ duration: state === 'idle' ? 20 : 4, repeat: Infinity, ease: 'linear' }}
          style={{ background: `conic-gradient(from 0deg, transparent, ${c.primary}, transparent 60%, ${c.primary}80, transparent)` }}
        />
      </div>

      {/* Sonar rings when listening */}
      {state === 'listening' && [0, 0.6, 1.2].map(d => (
        <motion.div key={d} className="absolute inset-0 rounded-[22%] border" animate={{ scale: [1, 1.6], opacity: [0.5, 0] }} transition={{ duration: 1.2, repeat: Infinity, delay: d }} style={{ borderColor: c.primary }} />
      ))}

      {/* Sound bars when talking */}
      {state === 'talking' && (
        <div className="absolute inset-0 flex items-center justify-center gap-0.5">
          {[0,1,2,3].map(i => <motion.div key={i} className="w-0.5 rounded-full" style={{ background: c.primary }} animate={{ height: [size*0.12, size*0.45, size*0.12] }} transition={{ duration: 0.2, repeat: Infinity, delay: i*0.04 }} />)}
        </div>
      )}

      {/* Thinking spinner */}
      {state === 'thinking' && (
        <motion.div className="absolute inset-0 rounded-[22%] border-2 border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity }} style={{ borderColor: c.primary, borderTopColor: 'transparent' }} />
      )}

      {/* K letter */}
      <span className="relative font-display text-white/90 flex items-center justify-center h-full" style={{ fontSize: size * 0.3 }}>K</span>
    </motion.button>
  )
}

// Main Jarvis controller — manages push-to-talk, voice, panel
export function Jarvis({ trigger }: { trigger?: number }) {
  const { open: openWindow, activeId, windows } = useWindowStore()
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState<JarvisMessage[]>([])
  const [transcript, setTranscript] = useState('')
  const [muted, setMuted] = useState(false)
  const [pttActive, setPttActive] = useState(false)

  const recognitionRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])
  const bestVoiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const isProcessingRef = useRef(false)
  const spaceHeldRef = useRef(false)
  const finalTranscriptRef = useRef('')

  const activeWindowName = activeId ? APPS.find(a => a.id === activeId)?.name || activeId : null

  // Load voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const load = () => {
      const vs = window.speechSynthesis.getVoices()
      if (vs.length) {
        voicesRef.current = vs
        // Pick deepest male English voice
        const preferred = ['Google UK English Male', 'Microsoft Guy', 'Microsoft David', 'Daniel', 'Oliver', 'Arthur', 'Microsoft Ravi', 'Google US English']
        for (const name of preferred) {
          const m = vs.find(v => v.name.includes(name) && v.lang.startsWith('en'))
          if (m) { bestVoiceRef.current = m; return }
        }
        bestVoiceRef.current = vs.find(v => v.lang.startsWith('en')) || vs[0]
      }
    }
    load()
    window.speechSynthesis.onvoiceschanged = load
    return () => { window.speechSynthesis.onvoiceschanged = null }
  }, [])

  // Auto-scroll
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Trigger from dock orb click
  useEffect(() => {
    if (trigger && trigger > 0) {
      if (expanded) { closePanel() } else { openPanel() }
    }
  }, [trigger])

  // --- KEYBOARD: ⌘+Space to open/close, Hold Space for push-to-talk ---
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // ⌘+Space or Ctrl+Space → toggle panel
      if ((e.metaKey || e.ctrlKey) && e.code === 'Space') {
        e.preventDefault(); e.stopPropagation()
        if (expanded) { closePanel() } else { openPanel() }
        return
      }
      // Hold Space → push to talk (only when panel is open and not typing)
      if (e.code === 'Space' && !e.metaKey && !e.ctrlKey && !e.shiftKey && expanded && !isProcessingRef.current) {
        // Don't intercept if user is typing in an input
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
        e.preventDefault()
        if (!spaceHeldRef.current) {
          spaceHeldRef.current = true
          startPTT()
        }
      }
      if (e.key === 'Escape' && expanded) { closePanel() }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && spaceHeldRef.current) {
        e.preventDefault()
        spaceHeldRef.current = false
        stopPTT()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyUp, true)
    }
  }, [expanded])

  const openPanel = useCallback(() => {
    setExpanded(true)
    const greetings = [
      "Hello Founder. Krishna here. How can I help?",
      "Yes Sir. I'm listening.",
      "At your service, Founder. What do you need?",
      "Krishna online. All systems operational.",
    ]
    const g = greetings[Math.floor(Math.random() * greetings.length)]
    setMessages(m => [...m, { role: 'jarvis', text: g, ts: Date.now() }])
    // Speak greeting — must be triggered by user gesture (⌘+Space keydown)
    setTimeout(() => speak(g), 100)
  }, [])

  const closePanel = useCallback(() => {
    setExpanded(false)
    setPttActive(false)
    spaceHeldRef.current = false
    stopRecognition()
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setGlobalState('idle')
  }, [])

  // --- PUSH TO TALK ---
  const startPTT = useCallback(() => {
    if (typeof window === 'undefined') return
    // Cancel any ongoing speech
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { toast.error('Voice not supported', 'Use Chrome or Edge'); return }

    if (recognitionRef.current) { try { recognitionRef.current.abort() } catch {} }

    const recognition = new SR()
    recognition.continuous = true   // Keep listening while spacebar held
    recognition.interimResults = true
    recognition.lang = 'en-US'
    finalTranscriptRef.current = ''

    recognition.onresult = (event: any) => {
      let final = ''
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) final += t
        else interim += t
      }
      finalTranscriptRef.current = final
      setTranscript(final + interim)
    }

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.error('STT error:', event.error)
      }
    }

    recognition.onend = () => {
      // Only called when we abort or spacebar released — do nothing here
      // stopPTT handles the send
    }

    recognitionRef.current = recognition
    setTranscript('')
    setPttActive(true)
    setGlobalState('listening')
    try { recognition.start() } catch {}
  }, [])

  const stopPTT = useCallback(() => {
    stopRecognition()
    setPttActive(false)
    setGlobalState('idle')
    // Send whatever was captured
    const text = finalTranscriptRef.current.trim()
    setTranscript('')
    if (text) {
      sendToJarvis(text)
    }
  }, [])

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch {}
      recognitionRef.current = null
    }
  }, [])

  // --- SEND TO KRISHNA ---
  const sendToJarvis = useCallback(async (text: string) => {
    if (!text.trim() || isProcessingRef.current) return
    isProcessingRef.current = true

    setMessages(prev => [...prev, { role: 'user', text, ts: Date.now() }])
    setTranscript('')
    setGlobalState('thinking')

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

      setMessages(prev => [...prev, { role: 'jarvis', text: data.spoken, ts: Date.now() }])

      // Execute UI action
      if (data.action?.type === 'open_app') {
        const app = APPS.find(a =>
          a.id === data.action.app ||
          a.name.toLowerCase().includes(data.action.app?.toLowerCase()) ||
          a.shortName.toLowerCase().includes(data.action.app?.toLowerCase())
        )
        if (app) openWindow(app.id, app.name)
      }

      // Speak
      if (!muted && data.spoken) {
        await speak(data.spoken)
      } else {
        setGlobalState('idle')
      }
    } catch {
      const fb = "I'm here, Founder. How can I assist?"
      setMessages(prev => [...prev, { role: 'jarvis', text: fb, ts: Date.now() }])
      if (!muted) await speak(fb)
      else setGlobalState('idle')
    } finally {
      isProcessingRef.current = false
      // After response, go back to idle — user holds Space again to talk
      setGlobalState('idle')
    }
  }, [activeWindowName, windows, muted, openWindow])

  // --- SPEAK (browser TTS — zero latency, deep male voice) ---
  const speak = useCallback(async (text: string) => {
    setGlobalState('talking')
    const clean = preprocessForSpeech(text)

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setGlobalState('idle'); return
    }

    window.speechSynthesis.cancel()

    await new Promise<void>((resolve) => {
      const u = new SpeechSynthesisUtterance(clean)
      if (bestVoiceRef.current) u.voice = bestVoiceRef.current
      u.rate = 1.0
      u.pitch = 0.8   // Deep, JARVIS-like
      u.volume = 1.0
      let done = false
      const finish = () => { if (!done) { done = true; resolve() } }
      u.onend = finish
      u.onerror = finish
      setTimeout(finish, 15000) // safety
      window.speechSynthesis.speak(u)
    })

    setGlobalState('idle')
  }, [])

  // Text input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const t = e.target as HTMLTextAreaElement
      if (t.value.trim()) { sendToJarvis(t.value.trim()); t.value = '' }
    }
  }

  return (
    <AnimatePresence>
      {expanded && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="fixed z-[9900] w-[400px] rounded-2xl overflow-hidden"
          style={{
            bottom: '90px', left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(8, 8, 10, 0.85)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 pt-3 pb-2">
            <div className="w-2 h-2 rounded-full" style={{
              background: globalJarvisState === 'idle' ? '#5856D6' : globalJarvisState === 'listening' ? '#FF3B30' : globalJarvisState === 'thinking' ? '#FF9500' : '#34C759',
              boxShadow: '0 0 8px currentColor',
            }} />
            <span className="font-display text-xs text-white/80">Krishna</span>
            <span className="text-[9px] text-white/30">
              {pttActive ? '· listening...' : globalJarvisState === 'thinking' ? '· thinking...' : globalJarvisState === 'talking' ? '· speaking...' : '· hold SPACE to talk'}
            </span>
            <div className="ml-auto flex items-center gap-1">
              <button onClick={() => setMuted(!muted)} className="text-white/30 hover:text-white/60 p-1">
                {muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
              </button>
              <button onClick={closePanel} className="text-white/30 hover:text-white/60 p-1">
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="max-h-48 min-h-[60px] overflow-y-auto px-4 py-2 space-y-2">
            {messages.length === 0 && (
              <div className="text-center py-3 text-[10px] text-white/30">
                Hold SPACE to talk, or type below.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-[11px] leading-relaxed ${
                  m.role === 'user' ? 'bg-white/15 text-white/90' : 'bg-white/5 text-white/70 border border-white/5'
                }`}>{m.text}</div>
              </div>
            ))}
            {pttActive && transcript && (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-lg px-2.5 py-1.5 text-[11px] bg-white/8 text-white/40 italic">{transcript}</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* PTT indicator */}
          {pttActive && (
            <div className="px-4 py-1.5 bg-red-500/10 flex items-center justify-center gap-2">
              <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }} className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[10px] text-red-400">Listening — release SPACE to send</span>
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3 pt-2 flex items-center gap-2 border-t border-white/5">
            <textarea
              className="flex-1 bg-white/5 border border-white/8 rounded-lg px-2.5 py-1.5 text-[11px] text-white/80 placeholder:text-white/25 outline-none resize-none"
              placeholder="Type or hold SPACE to talk..."
              rows={1}
              onKeyDown={handleKeyDown}
              disabled={isProcessingRef.current}
            />
            {globalJarvisState === 'thinking' && <Loader2 className="h-3.5 w-3.5 text-white/40 animate-spin flex-shrink-0" />}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
