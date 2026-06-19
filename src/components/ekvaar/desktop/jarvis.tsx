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

// Global state sharing between orb and panel
let globalState: JarvisState = 'idle'
const listeners: ((s: JarvisState) => void)[] = []
function setGlobal(s: JarvisState) { globalState = s; listeners.forEach(f => f(s)) }

// ===== LARGE WALLPAPER ORB — multi-layered, glassmorphism, heartbeat =====
export function JarvisWallpaperOrb({ onClick }: { onClick: () => void }) {
  const [state, setState] = useState<JarvisState>('idle')
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    const fn = (s: JarvisState) => setState(s)
    listeners.push(fn)
    return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1) }
  }, [])

  const colors = {
    idle: { core: '#5856D6', ring: '#7B79E8', glow: 'rgba(88,86,214,0.25)', outer: 'rgba(88,86,214,0.08)' },
    listening: { core: '#FF3B30', ring: '#FF6B6B', glow: 'rgba(255,59,48,0.35)', outer: 'rgba(255,59,48,0.12)' },
    thinking: { core: '#0A84FF', ring: '#409CFF', glow: 'rgba(10,132,255,0.35)', outer: 'rgba(10,132,255,0.12)' },
    talking: { core: '#34C759', ring: '#5EE37B', glow: 'rgba(52,199,89,0.35)', outer: 'rgba(52,199,89,0.12)' },
  }
  const c = colors[state]

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-[8500] flex items-center justify-center pointer-events-none">
      <motion.button
        onClick={onClick}
        className="relative pointer-events-auto cursor-pointer"
        style={{ width: 200, height: 200 }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.5, duration: 1, type: 'spring' }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Outer ambient halo — always present */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            scale: state === 'idle' ? [1, 1.15, 1] : [1, 1.3, 1],
            opacity: state === 'idle' ? [0.15, 0.3, 0.15] : [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: state === 'idle' ? 5 : state === 'talking' ? 0.8 : 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{ background: `radial-gradient(circle, ${c.outer} 0%, transparent 70%)` }}
        />

        {/* Outer ring — glassmorphism, faint */}
        <div
          className="absolute rounded-full"
          style={{
            inset: '5%',
            border: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.02)',
            backdropFilter: 'blur(10px)',
          }}
        />

        {/* Mid ring — glassmorphism with color tint */}
        <motion.div
          className="absolute rounded-full"
          style={{
            inset: '15%',
            border: `1px solid ${c.ring}40`,
            background: `${c.core}08`,
            backdropFilter: 'blur(20px) saturate(180%)',
          }}
          animate={{
            boxShadow: [
              `0 0 30px ${c.glow}, inset 0 0 30px ${c.glow}`,
              `0 0 60px ${c.glow}, inset 0 0 50px ${c.glow}`,
              `0 0 30px ${c.glow}, inset 0 0 30px ${c.glow}`,
            ],
          }}
          transition={{
            duration: state === 'idle' ? 5 : state === 'talking' ? 0.7 : 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Tick marks around mid ring (like the reference) */}
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i * 15) * Math.PI / 180
          const x = 50 + 42 * Math.cos(angle)
          const y = 50 + 42 * Math.sin(angle)
          return (
            <div
              key={i}
              className="absolute w-px bg-white/10"
              style={{
                left: `${x}%`, top: `${y}%`,
                height: i % 6 === 0 ? '8px' : '4px',
                transform: `translate(-50%, -50%) rotate(${i * 15}deg)`,
                transformOrigin: 'center',
              }}
            />
          )
        })}

        {/* Inner energy ring — rotating conic gradient */}
        <motion.div
          className="absolute rounded-full overflow-hidden"
          style={{ inset: '25%' }}
          animate={{ rotate: 360 }}
          transition={{ duration: state === 'idle' ? 30 : 6, repeat: Infinity, ease: 'linear' }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `conic-gradient(from 0deg, transparent 0%, ${c.core}50 25%, transparent 50%, ${c.ring}50 75%, transparent 100%)`,
            }}
          />
        </motion.div>

        {/* Sonar rings when listening */}
        {state === 'listening' && [0, 0.7, 1.4].map(d => (
          <motion.div
            key={d}
            className="absolute rounded-full border-2"
            style={{ inset: '20%', borderColor: c.core }}
            animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: d, ease: 'easeOut' }}
          />
        ))}

        {/* Heartbeat pulse when talking — like a human heart */}
        {state === 'talking' && (
          <motion.div
            className="absolute rounded-full"
            style={{
              inset: '20%',
              background: `radial-gradient(circle, ${c.glow} 0%, transparent 70%)`,
            }}
            animate={{
              scale: [1, 1.25, 1, 1.15, 1],
              opacity: [0.4, 0.7, 0.4, 0.6, 0.4],
            }}
            transition={{
              duration: 0.9,
              repeat: Infinity,
              ease: 'easeInOut',
              times: [0, 0.15, 0.35, 0.55, 1],
            }}
          />
        )}

        {/* Thinking spinner ring */}
        {state === 'thinking' && (
          <motion.div
            className="absolute rounded-full border-2 border-t-transparent"
            style={{ inset: '18%', borderColor: c.core, borderTopColor: 'transparent' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          />
        )}

        {/* Core — the heart of Krishna */}
        <motion.div
          className="absolute rounded-full flex items-center justify-center overflow-hidden"
          style={{
            inset: '32%',
            background: `linear-gradient(135deg, ${c.core} 0%, ${c.core}CC 50%, ${c.core}80 100%)`,
            boxShadow: `inset 0 2px 4px rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.3), 0 4px 20px ${c.glow}`,
          }}
          animate={{
            scale: state === 'idle'
              ? [1, 1.04, 1]  // gentle breathing
              : state === 'talking'
              ? [1, 1.12, 1, 1.08, 1]  // heartbeat: lub-dub
              : 1,
          }}
          transition={{
            duration: state === 'idle' ? 4 : state === 'talking' ? 0.9 : 1,
            repeat: Infinity,
            ease: 'easeInOut',
            times: state === 'talking' ? [0, 0.15, 0.35, 0.55, 1] : undefined,
          }}
        >
          {/* Inner light */}
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.4), transparent 60%)` }}
          />
          {/* K letter */}
          <span className="relative font-display text-white/95" style={{ fontSize: 36, fontWeight: 300 }}>
            K
          </span>
        </motion.div>

        {/* Status label below orb */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="text-[10px] tracking-[0.2em] uppercase" style={{ color: c.core, opacity: 0.7 }}>
            {state === 'idle' ? 'Krishna' : state === 'listening' ? 'Listening' : state === 'thinking' ? 'Processing' : 'Speaking'}
          </span>
        </div>
      </motion.button>
    </div>
  )
}

// ===== MAIN JARVIS CONTROLLER =====
export function Jarvis({ trigger }: { trigger?: number }) {
  const { open: openWindow, activeId, windows } = useWindowStore()
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState<JarvisMessage[]>([])
  const [transcript, setTranscript] = useState('')
  const [muted, setMuted] = useState(false)
  const [pttActive, setPttActive] = useState(false)

  const recognitionRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
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

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Trigger from dock orb / external click
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
      if (e.code === 'Space' && !e.metaKey && !e.ctrlKey && !e.shiftKey && expanded && !isProcessingRef.current) {
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
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyUp, true)
    }
  }, [expanded])

  const openPanel = useCallback(() => {
    setExpanded(true)
    const greetings = ["Hello Founder. Krishna here. How can I help?", "Yes Sir. I'm listening.", "At your service, Founder.", "Krishna online. All systems operational."]
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

  // Push to talk
  const startPTT = useCallback(() => {
    if (typeof window === 'undefined') return
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { toast.error('Voice not supported', 'Use Chrome or Edge'); return }
    if (recognitionRef.current) { try { recognitionRef.current.abort() } catch {} }
    const recognition = new SR()
    recognition.continuous = true; recognition.interimResults = true; recognition.lang = 'en-US'
    finalTranscriptRef.current = ''
    recognition.onresult = (event: any) => {
      let final = '', interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) final += t; else interim += t
      }
      finalTranscriptRef.current = final
      setTranscript(final + interim)
    }
    recognition.onerror = (e: any) => { if (e.error !== 'no-speech' && e.error !== 'aborted') console.error('STT:', e.error) }
    recognitionRef.current = recognition
    setTranscript(''); setPttActive(true); setGlobal('listening')
    try { recognition.start() } catch {}
  }, [])

  const stopPTT = useCallback(() => {
    stopRecognition(); setPttActive(false); setGlobal('idle')
    const text = finalTranscriptRef.current.trim()
    setTranscript('')
    if (text) sendToJarvis(text)
  }, [])

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) { try { recognitionRef.current.abort() } catch {}; recognitionRef.current = null }
  }, [])

  const sendToJarvis = useCallback(async (text: string) => {
    if (!text.trim() || isProcessingRef.current) return
    isProcessingRef.current = true
    setMessages(prev => [...prev, { role: 'user', text, ts: Date.now() }])
    setTranscript(''); setGlobal('thinking')
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
      isProcessingRef.current = false
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
          className="fixed z-[9900] w-[400px] rounded-2xl overflow-hidden"
          style={{
            bottom: '100px', right: '24px',
            background: 'rgba(8, 8, 10, 0.85)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
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

          <div className="max-h-48 min-h-[60px] overflow-y-auto px-4 py-2 space-y-2">
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

          {pttActive && (
            <div className="px-4 py-1.5 bg-red-500/10 flex items-center justify-center gap-2">
              <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }} className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[10px] text-red-400">Listening — release SPACE to send</span>
            </div>
          )}

          <div className="px-3 pb-3 pt-2 flex items-center gap-2 border-t border-white/5">
            <textarea
              className="flex-1 bg-white/5 border border-white/8 rounded-lg px-2.5 py-1.5 text-[11px] text-white/80 placeholder:text-white/25 outline-none resize-none"
              placeholder="Type or hold SPACE to talk..."
              rows={1}
              onKeyDown={handleKeyDown}
              disabled={isProcessingRef.current}
            />
            {globalState === 'thinking' && <Loader2 className="h-3.5 w-3.5 text-white/40 animate-spin flex-shrink-0" />}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
