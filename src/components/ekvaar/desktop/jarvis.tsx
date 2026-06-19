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

// Pre-process text for better speech — expand acronyms, convert numbers to words, remove weird pauses
function preprocessForSpeech(text: string): string {
  const expansions: Record<string, string> = {
    'CMO': 'Chief Marketing Officer',
    'CTO': 'Chief Technology Officer',
    'CFO': 'Chief Financial Officer',
    'COO': 'Chief Operating Officer',
    'CCO': 'Chief Creative Officer',
    'CSM': 'Customer Success Manager',
    'CEO': 'Chief Executive Officer',
    'ROAS': 'return on ad spend',
    'CAC': 'customer acquisition cost',
    'LTV': 'lifetime value',
    'AOV': 'average order value',
    'P&L': 'profit and loss',
    'Q3': 'quarter three',
    'Q4': 'quarter four',
    'Q1': 'quarter one',
    'Q2': 'quarter two',
    'API': 'A P I',
    'OS': 'operating system',
    'AI': 'A I',
    'SKU': 'S K U',
    'PR': 'P R',
    'GSM': 'G S M',
    '₹': 'rupees ',
    'EKVAAR': 'Ekvaar',
  }
  let result = text
  for (const [abbr, full] of Object.entries(expansions)) {
    result = result.replace(new RegExp(`\\b${abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), full)
  }
  // Convert numbers to words for better speech
  result = result.replace(/\b(\d+)\b/g, (match, num) => {
    const n = parseInt(num)
    if (n >= 10000000) return numberToWords(Math.floor(n / 10000000)) + ' crore'
    if (n >= 100000) return numberToWords(Math.floor(n / 100000)) + ' lakh'
    if (n >= 1000) return numberToWords(Math.floor(n / 1000)) + ' thousand'
    return numberToWords(n)
  })
  // Convert percentages
  result = result.replace(/(\d+\.?\d*)%/g, (match, num) => {
    return num + ' percent'
  })
  // Remove markdown
  result = result.replace(/[*_#`]/g, '')
  // Remove SPOKEN: prefix
  result = result.replace(/^SPOKEN:\s*/i, '')
  // Clean up
  result = result.replace(/\s+/g, ' ').trim()
  return result
}

function numberToWords(n: number): string {
  if (n === 0) return 'zero'
  if (n < 0) return 'minus ' + numberToWords(-n)
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
  if (n < 20) return ones[n]
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
  if (n < 1000) return ones[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + numberToWords(n % 100) : '')
  if (n < 1000000) return numberToWords(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + numberToWords(n % 1000) : '')
  return numberToWords(Math.floor(n / 1000000)) + ' million' + (n % 1000000 ? ' ' + numberToWords(n % 1000000) : '')
}

// Pick the best available deep male English voice
function pickBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null
  // Priority list — deepest male English voices
  const preferred = [
    'Google UK English Male',
    'Microsoft Guy',
    'Microsoft David',
    'Daniel',
    'Oliver',
    'Arthur',
    'Microsoft Ravi', // Indian English male
    'Google US English',
  ]
  for (const name of preferred) {
    const match = voices.find(v => v.name.includes(name) && v.lang.startsWith('en'))
    if (match) return match
  }
  // Fallback: any English male voice
  const englishMale = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('male'))
  if (englishMale) return englishMale
  // Fallback: any English voice
  const english = voices.find(v => v.lang.startsWith('en'))
  return english || voices[0]
}

export function Jarvis() {
  const { open: openWindow, activeId, windows } = useWindowStore()
  const [expanded, setExpanded] = useState(false)
  const [state, setState] = useState<JarvisState>('idle')
  const [messages, setMessages] = useState<JarvisMessage[]>([])
  const [transcript, setTranscript] = useState('')
  const [muted, setMuted] = useState(false)

  const recognitionRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const shouldListenAfterRef = useRef(false)
  const isProcessingRef = useRef(false)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])
  const bestVoiceRef = useRef<SpeechSynthesisVoice | null>(null)

  const activeWindowName = activeId ? APPS.find(a => a.id === activeId)?.name || activeId : null

  // Load voices for browser TTS
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      if (voices.length) {
        voicesRef.current = voices
        bestVoiceRef.current = pickBestVoice(voices)
      }
    }
    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
    return () => { window.speechSynthesis.onvoiceschanged = null }
  }, [])

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.code === 'Space') {
        e.preventDefault()
        e.stopPropagation()
        wakeUp()
      }
      if (e.key === 'Escape' && expanded) {
        closeJarvis()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [expanded])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const wakeUp = useCallback(() => {
    setExpanded(prev => {
      if (!prev) {
        const greetings = [
          "Hello Founder. Krishna here. How can I help?",
          "Yes Sir. I'm listening.",
          "At your service, Founder. What do you need?",
          "Krishna online. All systems operational. Speak to me.",
        ]
        const greeting = greetings[Math.floor(Math.random() * greetings.length)]
        setMessages(m => [...m, { role: 'jarvis', text: greeting, ts: Date.now() }])
        // Speak greeting then auto-listen
        speak(greeting, true)
        return true
      }
      closeJarvis()
      return false
    })
  }, [])

  const closeJarvis = useCallback(() => {
    setExpanded(false)
    stopListening()
    shouldListenAfterRef.current = false
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }, [])

  // --- SPEECH RECOGNITION (STT) ---
  const startListening = useCallback(() => {
    if (isProcessingRef.current) return
    if (typeof window === 'undefined') return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      toast.error('Voice not supported', 'Use Chrome or Edge for voice input')
      return
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch {}
    }

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
        setState('idle')
        // In continuous mode, restart after brief pause
        if (shouldListenAfterRef.current && !isProcessingRef.current) {
          setTimeout(() => {
            if (shouldListenAfterRef.current && !isProcessingRef.current) startListening()
          }, 300)
        }
        return
      }
      if (event.error === 'not-allowed') {
        toast.error('Microphone blocked', 'Please allow mic access in browser settings')
        shouldListenAfterRef.current = false
      }
      setState('idle')
    }

    recognition.onend = () => {
      // Auto-restart in continuous mode
      if (shouldListenAfterRef.current && !isProcessingRef.current) {
        setTimeout(() => {
          if (shouldListenAfterRef.current && !isProcessingRef.current) {
            try { recognition.start() } catch {}
          }
        }, 300)
      } else {
        setState('idle')
      }
    }

    recognitionRef.current = recognition
    setTranscript('')
    setState('listening')
    try { recognition.start() } catch {}
  }, [])

  const stopListening = useCallback(() => {
    shouldListenAfterRef.current = false
    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch {}
      recognitionRef.current = null
    }
    setState(s => s === 'listening' ? 'idle' : s)
  }, [])

  // --- SEND TO KRISHNA ---
  const sendToJarvis = useCallback(async (text: string) => {
    if (!text.trim() || isProcessingRef.current) return
    isProcessingRef.current = true

    setMessages(prev => [...prev, { role: 'user', text, ts: Date.now() }])
    setTranscript('')
    setState('thinking')
    // Stop listening while processing
    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch {}
    }

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

      // Execute UI actions
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
      }
    } catch {
      const fallback = "I'm here, Founder. How can I assist?"
      setMessages(prev => [...prev, { role: 'jarvis', text: fallback, ts: Date.now() }])
      if (!muted) await speak(fallback)
    } finally {
      isProcessingRef.current = false
      // Auto-resume listening
      if (shouldListenAfterRef.current) {
        setTimeout(() => startListening(), 200)
      } else {
        setState('idle')
      }
    }
  }, [activeWindowName, windows, muted, openWindow, startListening])

  // --- TEXT TO SPEECH (TTS) ---
  // Uses browser speechSynthesis with deep male English voice for JARVIS-like quality
  // No API call = zero latency, no child-like voice
  const speak = useCallback(async (text: string, isGreeting = false) => {
    setState('talking')
    const cleanText = preprocessForSpeech(text)

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setState('idle')
      if (shouldListenAfterRef.current) setTimeout(() => startListening(), 200)
      return
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    await new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(cleanText)

      // Use best available deep male voice
      if (bestVoiceRef.current) {
        utterance.voice = bestVoiceRef.current
      }

      // JARVIS-like voice settings
      utterance.rate = 1.0       // Normal speed — not rushed
      utterance.pitch = 0.8      // Deep, authoritative
      utterance.volume = 1.0     // Full volume

      let resolved = false
      const finish = () => {
        if (resolved) return
        resolved = true
        resolve()
      }

      utterance.onend = finish
      utterance.onerror = finish

      // Safety timeout — resolve after max 10 seconds
      setTimeout(finish, 10000)

      window.speechSynthesis.speak(utterance)
    })

    setState('idle')

    // Auto-listen after speaking (continuous conversation)
    if (shouldListenAfterRef.current || isGreeting) {
      shouldListenAfterRef.current = true
      setTimeout(() => startListening(), 200)
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
      {/* Krishna orb embedded in dock center — always visible, overlays everything */}
      <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-[9800] pointer-events-auto"
           style={{ marginBottom: '72px' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.5, type: 'spring', stiffness: 200 }}
        >
          <JarvisOrb state={state} size={expanded ? 44 : 52} onClick={() => wakeUp()} />
        </motion.div>
      </div>

      {/* Conversation overlay — floats above ALL windows */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed z-[9900] w-[400px] rounded-2xl overflow-hidden"
            style={{
              bottom: '140px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(8, 8, 10, 0.92)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 100px ${state === 'listening' ? 'rgba(255,59,48,0.12)' : state === 'talking' ? 'rgba(52,199,89,0.12)' : 'rgba(88,86,214,0.08)'}`,
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 pt-3 pb-2">
              <div className="w-2 h-2 rounded-full" style={{
                background: state === 'idle' ? '#5856D6' : state === 'listening' ? '#FF3B30' : state === 'thinking' ? '#FF9500' : '#34C759',
                boxShadow: `0 0 8px currentColor`,
              }} />
              <span className="font-display text-xs text-white/80 tracking-tight">Krishna</span>
              <span className="text-[9px] text-white/30">
                {state === 'idle' && (shouldListenAfterRef.current ? '· listening mode' : '· ready')}
                {state === 'listening' && '· listening...'}
                {state === 'thinking' && '· thinking...'}
                {state === 'talking' && '· speaking...'}
              </span>
              <div className="ml-auto flex items-center gap-1">
                <button onClick={() => setMuted(!muted)} className="text-white/30 hover:text-white/60 p-1">
                  {muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                </button>
                <button onClick={closeJarvis} className="text-white/30 hover:text-white/60 p-1">
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="max-h-52 min-h-[70px] overflow-y-auto px-4 py-2 space-y-2.5">
              {messages.length === 0 && (
                <div className="text-center py-3 text-[10px] text-white/30">Speak or type to Krishna...</div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-[11px] leading-relaxed ${
                    m.role === 'user' ? 'bg-white/15 text-white/90' : 'bg-white/5 text-white/70 border border-white/5'
                  }`}>{m.text}</div>
                </div>
              ))}
              {state === 'listening' && transcript && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-lg px-2.5 py-1.5 text-[11px] bg-white/8 text-white/40 italic">{transcript}...</div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 pb-3 pt-2 flex items-center gap-2 border-t border-white/5">
              <button
                onClick={() => {
                  if (state === 'listening') {
                    stopListening()
                    shouldListenAfterRef.current = false
                  } else {
                    shouldListenAfterRef.current = true
                    startListening()
                  }
                }}
                className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-all ${
                  state === 'listening' ? 'bg-red-500/80 text-white' : shouldListenAfterRef.current ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/10 text-white/50 hover:bg-white/15'
                }`}
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

// Living orb — centered in dock, animated AI organism
function JarvisOrb({ state, size = 52, onClick }: { state: JarvisState; size?: number; onClick: () => void }) {
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
      {/* Ambient glow */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{ scale: state === 'idle' ? [1, 1.2, 1] : [1, 1.4, 1], opacity: state === 'idle' ? [0.2, 0.4, 0.2] : [0.4, 0.7, 0.4] }}
        transition={{ duration: state === 'idle' ? 4 : 0.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{ background: `radial-gradient(circle, ${c.glow} 0%, transparent 70%)` }}
      />

      {/* Sonar rings when listening */}
      {state === 'listening' && [0, 0.5, 1].map(d => (
        <motion.div key={d} className="absolute inset-0 rounded-full border" animate={{ scale: [1, 1.8], opacity: [0.5, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: d }} style={{ borderColor: c.primary }} />
      ))}

      {/* Sound waves when talking */}
      {state === 'talking' && (
        <div className="absolute inset-0 flex items-center justify-center gap-0.5">
          {[0,1,2,3,4].map(i => (
            <motion.div key={i} className="w-0.5 rounded-full" style={{ background: c.primary }} animate={{ height: [size*0.1, size*0.5, size*0.1] }} transition={{ duration: 0.25, repeat: Infinity, delay: i*0.05 }} />
          ))}
        </div>
      )}

      {/* Thinking spinner */}
      {state === 'thinking' && (
        <motion.div className="absolute inset-0 rounded-full border-2 border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity }} style={{ borderColor: c.primary, borderTopColor: 'transparent' }} />
      )}

      {/* Core orb */}
      <motion.div
        className="absolute rounded-full overflow-hidden flex items-center justify-center"
        style={{ inset: size*0.18, background: `linear-gradient(135deg, ${c.primary} 0%, ${c.secondary} 100%)`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 12px ${c.glow}` }}
        animate={{ scale: state === 'idle' ? [1, 1.04, 1] : 1 }}
        transition={{ duration: 3, repeat: state === 'idle' ? Infinity : 0 }}
      >
        <motion.div className="absolute inset-0 opacity-40" animate={{ rotate: 360 }} transition={{ duration: state === 'idle' ? 15 : 3, repeat: Infinity }} style={{ background: `conic-gradient(from 0deg, transparent, ${c.primary}, transparent 60%, ${c.secondary}, transparent)` }} />
        <motion.div className="absolute inset-0 rounded-full" animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 2, repeat: Infinity }} style={{ background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.3), transparent 60%)` }} />
        <span className="relative font-display text-white/90" style={{ fontSize: size * 0.3 }}>K</span>
      </motion.div>
    </motion.button>
  )
}
