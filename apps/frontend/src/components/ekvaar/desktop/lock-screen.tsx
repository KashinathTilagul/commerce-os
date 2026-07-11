'use client'

import { useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { useLockStore } from '@/lib/lock-store'

export function LockScreen() {
  const { data: session } = useSession()
  const { unlock } = useLockStore()
  const [email, setEmail] = useState(session?.user?.email ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true) // Start true while checking setup
  const [isSetupMode, setIsSetupMode] = useState(false)
  const [setupName, setSetupName] = useState('')

  useEffect(() => {
    fetch('/api/auth/setup')
      .then(res => res.json())
      .then(data => {
        if (!data.hasUsers) {
          setIsSetupMode(true)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (isSetupMode) {
      try {
        const res = await fetch('/api/auth/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name: setupName })
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Failed to initialize OS')
          setLoading(false)
          return
        }
        // Success! Now log them in immediately
        const result = await signIn('credentials', { email, password, redirect: false })
        setLoading(false)
        if (result?.error) {
          setError('Setup successful, but auto-login failed. Please refresh.')
        } else {
          unlock()
        }
      } catch (err) {
        setError('Network error during setup')
        setLoading(false)
      }
    } else {
      // Normal login
      const result = await signIn('credentials', { email, password, redirect: false })
      setLoading(false)
      if (result?.error) {
        setError('Incorrect credentials')
        setPassword('')
      } else {
        unlock()
      }
    }
  }

  const name = session?.user?.name || session?.user?.email || 'EKVAAR'
  const initial = name.charAt(0).toUpperCase()

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-black/40 backdrop-blur-2xl">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="flex flex-col items-center gap-4"
      >
        <div className="h-24 w-24 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-3xl font-display text-white">
          {initial}
        </div>
        <div className="text-white/90 text-lg font-medium">{name}</div>

        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-2 mt-2">
          {isSetupMode ? (
            <>
              <div className="text-white/60 text-xs mb-2">First-Boot Initialization</div>
              <input
                type="text"
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                placeholder="Founder Name"
                required
                disabled={loading}
                className="w-64 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-sm text-center placeholder:text-white/40 focus:outline-none focus:border-white/40"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Founder Email"
                required
                disabled={loading}
                className="w-64 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-sm text-center placeholder:text-white/40 focus:outline-none focus:border-white/40"
              />
            </>
          ) : (
            !session && (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                disabled={loading}
                className="w-64 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-sm text-center placeholder:text-white/40 focus:outline-none focus:border-white/40"
              />
            )
          )}
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              required
              disabled={loading}
              className="lock-password-input w-64 px-4 py-2 pr-10 rounded-full bg-white/10 border border-white/20 text-white text-sm text-center placeholder:text-white/40 focus:outline-none focus:border-white/40"
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-1 top-1/2 -translate-y-1/2 z-10 h-6 w-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <ArrowRight className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
          {error && <div className="text-red-300 text-xs mt-1">{error}</div>}
        </form>
      </motion.div>
    </div>
  )
}
