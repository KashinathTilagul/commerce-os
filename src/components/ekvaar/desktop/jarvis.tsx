'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Volume2, VolumeX, Mic } from 'lucide-react'
import { useWindowStore } from '@/lib/window-store'
import { APPS } from './app-registry'
import { toast } from './toast'

type JarvisState = 'idle' | 'listening' | 'thinking' | 'talking'

interface JarvisMessage {
  role: 'user' | 'jarvis'
  text: string
  ts: number
}

function preprocessForSpeech(text: string): string {
  const expansions: Record<string, string> = {
    'CMO': 'Chief Marketing Officer', 'CTO': 'Chief Technology Officer',
    'CFO': 'Chief Financial Officer', 'COO': 'Chief Operating Officer',
    'CCO': 'Chief Creative Officer', 'CSM': 'Customer Success Manager',
    'CEO': 'Chief Executive Officer', 'ROAS': 'return on ad spend',
    'P&L': 'profit and loss', 'Q3': 'quarter three', 'Q4': 'quarter four',
    'API': 'A P I', 'AI': 'A I', '₹': 'rupees ', 'EKVAAR': 'Ekvaar',
  }
  let r = text.replace(/^SPOKEN:\s*/i, '').replace(/[*_#`]/g, '')
  for (const [a, f] of Object.entries(expansions)) {
    r = r.replace(new RegExp(`\\b${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), f)
  }
  r = r.replace(/(\d+\.?\d*)%/g, '$1 percent')
  return r.replace(/\s+/g, ' ').trim()
}

let globalState: JarvisState = 'idle'
const listeners: ((s: JarvisState) => void)[] = []
function setGlobal(s: JarvisState) { globalState = s; listeners.forEach(f => f(s)) }

// ===== SMALL WALLPAPER ORB — corner, shrinks when windows open =====
export function JarvisWallpaperOrb({ onClick, hidden }: { onClick: () => void; hidden: boolean }) {
  const [state, setState] = useState<JarvisState>('idle')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    const fn = (s: JarvisState) => setState(s)
    listeners.push(fn)
    return () => { cancelAnimationFrame(raf); const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1) }
  }, [])

  if (!mounted) return null

  const colors = {
    idle: { core: '#5856D6', glow: 'rgba(88,86,214,0.25)' },
    listening: { core: '#FF3B30', glow: 'rgba(255,59,48,0.35)' },
    thinking: { core: '#0A84FF', glow: 'rgba(10,132,255,0.35)' },
    talking: { core: '#34C759', glow: 'rgba(52,199,89,0.35)' },
  }
  const c = colors[state]
  const size = hidden ? 40 : 80

  return (
    <motion.div
      className="fixed z-[8500] pointer-events-none"
      style={{ bottom: hidden ? '80px' : '40px', right: '24px' }}
      animate={{ opacity: hidden ? 0.4 : 1, scale: 1 }}
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
        {/* Ambient glow */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: state === 'talking' ? 0.9 : state === 'idle' ? 4 : 1.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ background: `radial-gradient(circle, ${c.glow} 0%, transparent 70%)` }}
        />

        {/* Sonar rings when listening */}
        {state === 'listening' && [0, 0.7, 1.4].map(d => (
          <motion.div key={d} className="absolute inset-0 rounded-full border-2" style={{ borderColor: c.core }} animate={{ scale: [1, 2], opacity: [0.5, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: d }} />
        ))}

        {/* Heartbeat when talking */}
        {state === 'talking' && (
          <motion.div className="absolute inset-0 rounded-full" style={{ background: c.glow }} animate={{ scale: [1, 1.25, 1, 1.15, 1], opacity: [0.3, 0.6, 0.3, 0.5, 0.3] }} transition={{ duration: 0.9, repeat: Infinity, times: [0, 0.15, 0.35, 0.55, 1] }} />
        )}

        {/* Thinking spinner */}
        {state === 'thinking' && <motion.div className="absolute inset-0 rounded-full border-2 border-t-transparent" style={{ borderColor: c.core }} animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity }} />}

        {/* Core orb — glassmorphism */}
        <motion.div
          className="absolute rounded-full flex items-center justify-center overflow-hidden"
          style={{
            inset: '20%',
            background: `linear-gradient(135deg, ${c.core} 0%, ${c.core}CC 100%)`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 12px ${c.glow}`,
            backdropFilter: 'blur(10px)',
          }}
          animate={{ scale: state === 'idle' ? [1, 1.04, 1] : state === 'talking' ? [1, 1.12, 1, 1.08, 1] : 1 }}
          transition={{ duration: state === 'idle' ? 4 : state === 'talking' ? 0.9 : 1, repeat: Infinity, times: state === 'talking' ? [0, 0.15, 0.35, 0.55, 1] : undefined }}
        >
          <motion.div className="absolute inset-0 opacity-30" animate={{ rotate: 360 }} transition={{ duration: state === 'idle' ? 15 : 4, repeat: Infinity }} style={{ background: `conic-gradient(from 0deg, transparent, ${c.core}, transparent 60%, ${c.core}80, transparent)` }} />
          <span className="relative font-display text-white/95" style={{ fontSize: size * 0.22 }}>K</span>
        </motion.div>
      </motion.button>
    </motion.div>
  )
}

// ===== MAIN JARVIS CONTROLLER =====
export function Jarvis({ trigger, hasOpenWindows }: { trigger?: number; hasOpenWindows?: boolean }) {
  const { open: openWindow, activeId, windows } = useWindowStore()
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState<JarvisMessage[]>([])
  const [transcript, setTranscript] = useState('')
  const [muted, setMuted] = useState(false)
  const [pttActive, setPttActive] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const recognitionRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const bestVoiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const spaceHeldRef = useRef(false)
  const finalTranscriptRef = useRef('')
  const interimTranscriptRef = useRef('')

  const activeWindowName = activeId ? APPS.find(a => a.id === activeId)?.name || activeId : null

  // Load voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const load = () => {
      const vs = window.speechSynthesis.getVoices()
      if (vs.length) {
        const preferred = ['Google UK English Male', 'Microsoft Guy', 'Microsoft David', 'Daniel', 'Oliver', 'Arthur', 'Microsoft Ravi', 'Google US English']
        for (const name of preferred) { const m = vs.find(v => v.name.includes(name) && v.lang.startsWith('en')); if (m) { bestVoiceRef.current = m; return } }
        bestVoiceRef.current = vs.find(v => v.lang.startsWith('en')) || vs[0]
      }
    }
    load()
    window.speechSynthesis.onvoiceschanged = load
    return () => { window.speechSynthesis.onvoiceschanged = null }
  }, [])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Trigger
  useEffect(() => {
    if (trigger && trigger > 0) {
      if (expanded) { closePanel() } else { openPanel() }
    }
  }, [trigger])

  // Keyboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.code === 'Space') {
        e.preventDefault(); e.stopPropagation()
        if (expanded) { closePanel() } else { openPanel() }
        return
      }
      if (e.code === 'Space' && !e.metaKey && !e.ctrlKey && !e.shiftKey && expanded) {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
        e.preventDefault()
        if (!spaceHeldRef.current) { spaceHeldRef.current = true; startPTT() }
      }
      if (e.key === 'Escape' && expanded) closePanel()
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && spaceHeldRef.current) {
        e.preventDefault(); spaceHeldRef.current = false; stopPTT()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)
    return () => { window.removeEventListener('keydown', onKeyDown, true); window.removeEventListener('keyup', onKeyUp, true) }
  }, [expanded])

  const openPanel = useCallback(() => {
    setExpanded(true)
    const greetings = ["Hello Founder. Krishna here.", "Yes Sir. I'm listening.", "At your service, Founder.", "Krishna online. All systems operational."]
    const g = greetings[Math.floor(Math.random() * greetings.length)]
    setMessages(m => [...m, { role: 'jarvis', text: g, ts: Date.now() }])
    setTimeout(() => speak(g), 100)
  }, [])

  const closePanel = useCallback(() => {
    setExpanded(false); setPttActive(false); spaceHeldRef.current = false
    stopRecognition()
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    setGlobal('idle')
  }, [])

  const startPTT = useCallback(() => {
    if (typeof window === 'undefined') return
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { toast.error('Voice not supported', 'Use Chrome or Edge'); return }
    if (recognitionRef.current) { try { recognitionRef.current.abort() } catch {} }
    const recognition = new SR()
    recognition.continuous = true; recognition.interimResults = true; recognition.lang = 'en-US'
    finalTranscriptRef.current = ''
    interimTranscriptRef.current = ''
    recognition.onresult = (event: any) => {
      let final = '', interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) final += t; else interim += t
      }
      finalTranscriptRef.current = final
      interimTranscriptRef.current = interim
      setTranscript(final + interim)
    }
    recognition.onerror = (e: any) => { if (e.error !== 'no-speech' && e.error !== 'aborted') console.error('STT:', e.error) }
    recognitionRef.current = recognition
    setTranscript(''); setPttActive(true); setGlobal('listening')
    try { recognition.start() } catch {}
  }, [])

  const stopPTT = useCallback(() => {
    stopRecognition(); setPttActive(false)
    // Use final transcript, or fall back to interim if final wasn't captured yet
    const text = (finalTranscriptRef.current.trim() || interimTranscriptRef.current.trim())
    setTranscript('')
    setGlobal('idle')
    if (text) {
      sendToJarvis(text)
    }
  }, [])

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) { try { recognitionRef.current.abort() } catch {}; recognitionRef.current = null }
  }, [])

  const sendToJarvis = useCallback(async (text: string) => {
    if (!text.trim()) return
    setIsProcessing(true)
    setMessages(prev => [...prev, { role: 'user', text, ts: Date.now() }])
    setTranscript('')
    setGlobal('thinking')
    try {
      const r = await fetch('/api/jarvis/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, context: `Active: ${activeWindowName || 'none'}. Windows: ${windows.length}.`, activeWindow: activeWindowName }),
      })
      if (!r.ok) throw new Error('Failed')
      const data = await r.json()
      setMessages(prev => [...prev, { role: 'jarvis', text: data.spoken, ts: Date.now() }])
      if (data.action?.type === 'open_app') {
        const app = APPS.find(a => a.id === data.action.app || a.name.toLowerCase().includes(data.action.app?.toLowerCase()) || a.shortName.toLowerCase().includes(data.action.app?.toLowerCase()))
        if (app) openWindow(app.id, app.name)
      }
      if (!muted && data.spoken) await speak(data.spoken)
      else setGlobal('idle')
    } catch {
      const fb = "I'm here, Founder. How can I assist?"
      setMessages(prev => [...prev, { role: 'jarvis', text: fb, ts: Date.now() }])
      if (!muted) await speak(fb); else setGlobal('idle')
    } finally {
      setIsProcessing(false)
      setGlobal('idle')
    }
  }, [activeWindowName, windows, muted, openWindow])

  const speak = useCallback(async (text: string) => {
    setGlobal('talking')
    const clean = preprocessForSpeech(text)
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) { setGlobal('idle'); return }
    window.speechSynthesis.cancel()
    await new Promise<void>((resolve) => {
      const u = new SpeechSynthesisUtterance(clean)
      if (bestVoiceRef.current) u.voice = bestVoiceRef.current
      u.rate = 1.0; u.pitch = 0.8; u.volume = 1.0
      let done = false
      const finish = () => { if (!done) { done = true; resolve() } }
      u.onend = finish; u.onerror = finish
      setTimeout(finish, 15000)
      window.speechSynthesis.speak(u)
    })
    setGlobal('idle')
  }, [])

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
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="fixed z-[9900] w-[380px] rounded-2xl overflow-hidden"
          style={{
            bottom: '90px', right: '20px',
            background: 'rgba(8, 8, 10, 0.88)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 pt-3 pb-2">
            <div className="w-2 h-2 rounded-full" style={{
              background: globalState === 'idle' ? '#5856D6' : globalState === 'listening' ? '#FF3B30' : globalState === 'thinking' ? '#0A84FF' : '#34C759',
              boxShadow: '0 0 8px currentColor',
            }} />
            <span className="font-display text-xs text-white/80">Krishna</span>
            <span className="text-[9px] text-white/30">
              {pttActive ? '· listening...' : globalState === 'thinking' ? '· thinking...' : globalState === 'talking' ? '· speaking...' : '· hold SPACE to talk'}
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
          <div className="max-h-52 min-h-[60px] overflow-y-auto px-4 py-2 space-y-2">
            {messages.length === 0 && <div className="text-center py-3 text-[10px] text-white/30">Hold SPACE to talk, or type below.</div>}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-[11px] leading-relaxed ${m.role === 'user' ? 'bg-white/15 text-white/90' : 'bg-white/5 text-white/70 border border-white/5'}`}>{m.text}</div>
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

          {/* Input — ALWAYS enabled, even during processing */}
          <div className="px-3 pb-3 pt-2 flex items-center gap-2 border-t border-white/5">
            <button
              onClick={() => {
                if (pttActive) { stopPTT() } else { startPTT() }
              }}
              className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-all ${pttActive ? 'bg-red-500/80 text-white' : 'bg-white/10 text-white/50 hover:bg-white/15'}`}
            >
              <Mic className="h-3.5 w-3.5" />
            </button>
            <textarea
              className="flex-1 bg-white/5 border border-white/8 rounded-lg px-2.5 py-1.5 text-[11px] text-white/80 placeholder:text-white/25 outline-none resize-none"
              placeholder={isProcessing ? 'Krishna is responding...' : 'Type or hold SPACE to talk...'}
              rows={1}
              onKeyDown={handleKeyDown}
              disabled={false}
            />
            {isProcessing && <Loader2 className="h-3.5 w-3.5 text-white/40 animate-spin flex-shrink-0" />}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
