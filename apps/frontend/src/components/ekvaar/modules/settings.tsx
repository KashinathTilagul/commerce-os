'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Moon, Sun, Monitor, Cpu, Shield, Bell, Palette, Zap, Loader2, Key, Mic, MessageSquare, Play, Trash2, AlertTriangle } from 'lucide-react'
import { PageHeader } from '../shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useThemeStore } from '@/lib/theme-store'
import { toast } from '@/components/ekvaar/desktop/toast'
import { useEffect, useState, useRef } from 'react'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export function Settings() {
  const { mode, accent, setMode, setAccent } = useThemeStore()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [promptValue, setPromptValue] = useState('')
  const promptTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [orgNameValue, setOrgNameValue] = useState('')
  const [providerDraft, setProviderDraft] = useState<Record<string, string>>({})
  const orgNameTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hasSyncedRef = useRef(false)
  // Local voice state — reads from localStorage first so it's instant even before server responds
  const [localVoice, setLocalVoice] = useState(() => {
    try { return localStorage.getItem('krishna_voice') || 'en-IN-NeerjaNeural' } catch { return 'en-IN-NeerjaNeural' }
  })

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const r = await fetch('/api/settings')
      if (!r.ok) throw new Error('Failed to fetch settings')
      return r.json()
    },
  })

  // Sync server voice + prompt to local state (one-time on load)
  useEffect(() => {
    if (settings && !isLoading && !hasSyncedRef.current) {
      hasSyncedRef.current = true
      if (settings.ttsVoice) setLocalVoice(settings.ttsVoice) // eslint-disable-line react-hooks/set-state-in-effect
      if (settings.krishnaPrompt !== undefined) setPromptValue(settings.krishnaPrompt) // eslint-disable-line react-hooks/set-state-in-effect
      if (settings.organizationName !== undefined) setOrgNameValue(settings.organizationName) // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [settings, isLoading])

  // Cleanup debounce timeout
  useEffect(() => {
    return () => {
      if (promptTimeoutRef.current) clearTimeout(promptTimeoutRef.current)
      if (orgNameTimeoutRef.current) clearTimeout(orgNameTimeoutRef.current)
    }
  }, [])

  const mutation = useMutation({
    mutationFn: async (updates: any) => {
      const r = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Failed to save settings')
      return data
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['settings'], data)
      if (Object.keys(variables).some((key) => /^(primary|fallback[12])/.test(key))) {
        setProviderDraft({})
      }
      // Don't toast theme/accent — they already have their own toasts
      const silent = ['theme', 'accent']
      if (!Object.keys(variables).some(k => silent.includes(k))) {
        toast.success('Saved')
      }
    },
    onError: (error: Error) => {
      toast.error('Save failed', error.message)
    },
  })

  const handleChange = (key: string, value: any) => {
    // Optimistic UI for theme immediately
    if (key === 'theme') {
      setMode(value)
      toast.success('Theme applied', `${value.charAt(0).toUpperCase() + value.slice(1)} mode active`)
    }
    if (key === 'accent') {
      setAccent(value)
      toast.success('Accent color updated')
    }
    
    // Save to backend
    mutation.mutate({ [key]: value })
  }

  const handleApply = () => {
    if (Object.keys(providerDraft).length === 0) {
      toast.info('No provider changes to save')
      return
    }
    mutation.mutate(providerDraft)
  }

  const handleReset = () => {
    mutation.mutate({
      theme: 'dark',
      accent: '#C8302A',
      notifications: true,
      agentHeartbeats: true,
      approvalAlerts: true,
      budgetAlerts: true,
      maxTokens: 80,
      intelligence: 'claude-sonnet',
      autoApproveLimit: 5000,
      escalationPolicy: 'standard'
    })
    setMode('dark')
    setAccent('#C8302A')
    toast.info('Reset to defaults')
  }

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center text-muted-foreground gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading settings...</div>
  }

  const s = settings || {}

  return (
    <div>
      <PageHeader
        eyebrow="System Settings"
        title="Preferences"
        description="Global configuration for system preferences, theme, intelligence endpoints, and governance thresholds."
      />

      <div className="px-6 lg:px-10 py-8 space-y-6">
        {/* Organization */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display tracking-tight text-base flex items-center gap-2">
              <Palette className="h-4 w-4" /> Organization
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Shown on the boot screen and throughout the OS.</p>
          </CardHeader>
          <CardContent>
            <Row label="Business name" desc="Your organization's display name">
              <Input
                value={orgNameValue}
                onChange={(e) => {
                  const newValue = e.target.value
                  setOrgNameValue(newValue)
                  if (orgNameTimeoutRef.current) clearTimeout(orgNameTimeoutRef.current)
                  orgNameTimeoutRef.current = setTimeout(() => {
                    handleChange('organizationName', newValue)
                  }, 500)
                }}
                placeholder="Your Business"
                className="h-8 text-xs w-56"
              />
            </Row>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display tracking-tight text-base flex items-center gap-2">
              <Palette className="h-4 w-4" /> Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Row label="Theme" desc="Choose system visual mode">
              <div className="flex gap-2">
                <ThemeButton active={mode === 'light'} onClick={() => handleChange('theme', 'light')} icon={Sun} label="Light" />
                <ThemeButton active={mode === 'dark'} onClick={() => handleChange('theme', 'dark')} icon={Moon} label="Dark" />
                <ThemeButton active={mode === 'auto'} onClick={() => handleChange('theme', 'auto')} icon={Monitor} label="Auto" />
              </div>
            </Row>
            <Row label="Accent color" desc="System highlight color">
              <div className="flex gap-2">
                {['#C8302A', '#1F3A5F', '#2F4F3A', '#D4859B', '#FF9500', '#8B7355'].map((c) => (
                  <button
                    key={c}
                    onClick={() => handleChange('accent', c)}
                    className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      background: c,
                      borderColor: accent === c ? 'var(--foreground)' : 'var(--border)',
                      boxShadow: accent === c ? `0 0 0 2px ${c}` : 'none',
                    }}
                  />
                ))}
              </div>
            </Row>
          </CardContent>
        </Card>

        {/* Intelligence Core */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display tracking-tight text-base flex items-center gap-2">
              <Cpu className="h-4 w-4" /> Intelligence Core
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Krishna routes through these providers in order — Primary first, then each Fallback if the one before it fails or is unset. Mix free and paid keys as needed; a slot left blank is simply skipped.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProviderSlot
              title="Primary"
              provider={providerDraft.primaryProvider ?? s.primaryProvider} model={providerDraft.primaryModel ?? s.primaryModel} apiKey={providerDraft.primaryApiKey ?? ''} baseUrl={providerDraft.primaryBaseUrl ?? s.primaryBaseUrl}
              hasApiKey={Boolean(s.hasPrimaryApiKey) && providerDraft.primaryApiKey === undefined}
              onChange={(field, value) => setProviderDraft((draft) => ({ ...draft, [`primary${field}`]: value }))}
            />
            <ProviderSlot
              title="Fallback 1"
              provider={providerDraft.fallback1Provider ?? s.fallback1Provider} model={providerDraft.fallback1Model ?? s.fallback1Model} apiKey={providerDraft.fallback1ApiKey ?? ''} baseUrl={providerDraft.fallback1BaseUrl ?? s.fallback1BaseUrl}
              hasApiKey={Boolean(s.hasFallback1ApiKey) && providerDraft.fallback1ApiKey === undefined}
              onChange={(field, value) => setProviderDraft((draft) => ({ ...draft, [`fallback1${field}`]: value }))}
            />
            <ProviderSlot
              title="Fallback 2"
              provider={providerDraft.fallback2Provider ?? s.fallback2Provider} model={providerDraft.fallback2Model ?? s.fallback2Model} apiKey={providerDraft.fallback2ApiKey ?? ''} baseUrl={providerDraft.fallback2BaseUrl ?? s.fallback2BaseUrl}
              hasApiKey={Boolean(s.hasFallback2ApiKey) && providerDraft.fallback2ApiKey === undefined}
              onChange={(field, value) => setProviderDraft((draft) => ({ ...draft, [`fallback2${field}`]: value }))}
            />
            <Row label="Max token budget %" desc="Auto-pause agents at this threshold">
              <div className="w-56">
                <Slider value={[s.maxTokens ?? 80]} onValueChange={(v) => handleChange('maxTokens', v[0])} max={100} step={5} />
                <div className="text-right text-xs font-mono mt-1">{s.maxTokens ?? 80}%</div>
              </div>
            </Row>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display tracking-tight text-base flex items-center gap-2">
              <Bell className="h-4 w-4" /> Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Row label="All notifications" desc="Master toggle for system alerts">
              <Switch checked={s.notifications ?? true} onCheckedChange={(v) => handleChange('notifications', v)} />
            </Row>
            <Row label="Agent heartbeats" desc="Notify when agents wake or complete tasks">
              <Switch checked={s.agentHeartbeats ?? true} onCheckedChange={(v) => handleChange('agentHeartbeats', v)} />
            </Row>
            <Row label="Approval requests" desc="Surface inbox items needing founder action">
              <Switch checked={s.approvalAlerts ?? true} onCheckedChange={(v) => handleChange('approvalAlerts', v)} />
            </Row>
            <Row label="Budget alerts" desc="Warn at 80% token spend">
              <Switch checked={s.budgetAlerts ?? true} onCheckedChange={(v) => handleChange('budgetAlerts', v)} />
            </Row>
          </CardContent>
        </Card>

        {/* Krishna Voice */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display tracking-tight text-base flex items-center gap-2">
              <Mic className="h-4 w-4" /> Krishna Voice
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Pocket TTS (kyutai local neural) + Edge TTS cloud voices. Change takes effect immediately.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Row label="Voice" desc="Krishna's speaking voice">
              <div className="flex items-center gap-2">
                <Select
                  value={localVoice}
                  onValueChange={(v) => {
                    setLocalVoice(v)
                    // Save to localStorage immediately — works even if server save fails
                    try { localStorage.setItem('krishna_voice', v) } catch {}
                    handleChange('ttsVoice', v)
                  }}
                >
                  <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Pocket TTS — kyutai Local Neural</div>
                    <SelectItem value="charles">Charles — English Male</SelectItem>
                    <SelectItem value="eve">Eve — English Female</SelectItem>
                    <SelectItem value="anna">Anna — English Female (warm)</SelectItem>
                    <SelectItem value="alba">Alba — English Female (clear)</SelectItem>
                    <SelectItem value="estelle">Estelle — English Female</SelectItem>
                    <SelectItem value="lola">Lola — English Female</SelectItem>
                    <SelectItem value="giovanni">Giovanni — Male</SelectItem>
                    <SelectItem value="rafael">Rafael — Male</SelectItem>
                    <div className="px-2 py-1 text-[10px] font-mono text-muted-foreground uppercase tracking-wider border-t border-border mt-1 pt-2">Edge TTS — Cloud Neural</div>
                    <SelectItem value="en-IN-NeerjaNeural">Neerja — Indian English Female</SelectItem>
                    <SelectItem value="en-IN-PrabhatNeural">Prabhat — Indian English Male</SelectItem>
                    <SelectItem value="hi-IN-SwaraNeural">Swara — Hindi Female</SelectItem>
                    <SelectItem value="hi-IN-MadhurNeural">Madhur — Hindi Male</SelectItem>
                    <SelectItem value="en-US-AndrewNeural">Andrew — US English Male</SelectItem>
                    <SelectItem value="en-US-EmmaNeural">Emma — US English Female</SelectItem>
                    <SelectItem value="en-US-BrianNeural">Brian — US English Male (deep)</SelectItem>
                    <SelectItem value="en-US-AvaNeural">Ava — US English Female (warm)</SelectItem>
                    <SelectItem value="en-GB-RyanNeural">Ryan — British Male</SelectItem>
                    <SelectItem value="en-GB-SoniaNeural">Sonia — British Female</SelectItem>
                    <SelectItem value="en-AU-WilliamNeural">William — Australian Male</SelectItem>
                    <SelectItem value="en-AU-NatashaNeural">Natasha — Australian Female</SelectItem>
                  </SelectContent>
                </Select>
                <VoicePreviewButton voice={localVoice} />
              </div>
            </Row>
          </CardContent>
        </Card>

        {/* Krishna Behaviour */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display tracking-tight text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Krishna Behaviour
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Custom system prompt — overrides the default. Leave blank to use default behaviour. No restrictions.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              value={promptValue}
              onChange={(e) => {
                const newValue = e.target.value
                setPromptValue(newValue)
                if (promptTimeoutRef.current) clearTimeout(promptTimeoutRef.current)
                promptTimeoutRef.current = setTimeout(() => {
                  handleChange('krishnaPrompt', newValue)
                }, 500)
              }}
              placeholder={`You are Krishna, the central AI of this Business OS...\n\nDefine personality, tone, language, restrictions (or none), and anything else you want Krishna to follow.`}
              className="w-full h-48 bg-muted/30 border border-border rounded-md px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-1 focus:ring-arav placeholder:text-muted-foreground/40"
            />
            <p className="text-[11px] text-muted-foreground mt-1.5">Changes save automatically. Affects next message — no restart needed.</p>
          </CardContent>
        </Card>


        {/* Governance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display tracking-tight text-base flex items-center gap-2">
              <Shield className="h-4 w-4" /> Governance & Approval Engine
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Row label="Auto-approve threshold" desc="Max spend agents can execute without approval">
              <Input
                value={`₹${s.autoApproveLimit ?? 5000}`}
                onChange={(e) => handleChange('autoApproveLimit', Number(e.target.value.replace(/[^\d]/g, '')))}
                className="w-32 font-mono text-xs"
              />
            </Row>
            <Row label="Board approval required" desc="Strategic actions needing founder sign-off">
              <Badge variant="outline">Hiring · Campaigns · Budget reallocation</Badge>
            </Row>
            <Row label="Escalation policy" desc="When to surface to founder inbox">
              <Select value={s.escalationPolicy || 'standard'} onValueChange={(v) => handleChange('escalationPolicy', v)}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Minimal (critical only)</SelectItem>
                  <SelectItem value="standard">Standard (default)</SelectItem>
                  <SelectItem value="verbose">Verbose (all decisions)</SelectItem>
                </SelectContent>
              </Select>
            </Row>
          </CardContent>
        </Card>

        {/* Backend engines */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display tracking-tight text-base flex items-center gap-2">
              <Zap className="h-4 w-4" /> Backend Engines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: 'Workforce Engine', endpoint: '/api/workforce', status: 'ACTIVE' },
              { name: 'CEO Engine', endpoint: '/api/ceo', status: 'ACTIVE' },
              { name: 'Agent Runtime', endpoint: '/api/runtime', status: 'ACTIVE' },
              { name: 'Approval Engine', endpoint: '/api/approvals', status: 'ACTIVE' },
              { name: 'Graph API', endpoint: '/api/graph', status: 'ACTIVE' },
              { name: 'Event Bus', endpoint: '/api/events', status: 'ACTIVE' },
              { name: 'Intelligence Layer', endpoint: '/api/intelligence', status: 'ACTIVE' },
            ].map((e) => (
              <div key={e.name} className="flex items-center justify-between py-2 border-b border-border/60 last:border-0">
                <div>
                  <div className="text-sm font-medium">{e.name}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">{e.endpoint}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 bg-arav rounded-full animate-pulse-soft" />
                  <span className="text-[10px] tracking-wider uppercase text-arav">{e.status}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-agni/30">
          <CardHeader className="pb-3">
            <CardTitle className="font-display tracking-tight text-base flex items-center gap-2 text-agni">
              <AlertTriangle className="h-4 w-4" /> Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Delete Account</div>
                <div className="text-[11px] text-muted-foreground">
                  Permanently delete your account and all data. This cannot be undone.
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-1.5">
                    <Trash2 className="h-3.5 w-3.5" /> Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete your account along with all your data including:
                      <ul className="mt-2 ml-4 list-disc text-sm">
                        <li>All digital agents and AI systems</li>
                        <li>Products, orders, and customers</li>
                        <li>Issues, approvals, and events</li>
                        <li>All settings and preferences</li>
                      </ul>
                      <p className="mt-3 font-medium text-agni">This action cannot be undone.</p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        setDeleting(true)
                        try {
                          const res = await fetch('/api/account/delete', { method: 'POST' })
                          if (res.ok) {
                            if (typeof window !== 'undefined') {
                              localStorage.removeItem('ekvaar_krishna_history')
                              localStorage.removeItem('krishna_voice')
                              localStorage.clear()
                            }
                            toast.success('Account deleted', 'Goodbye, Founder.')
                            signOut({ callbackUrl: '/login' })
                          } else {
                            const data = await res.json().catch(() => ({}))
                            toast.error('Failed', data.error || 'Could not delete account')
                          }
                        } catch {
                          toast.error('Failed', 'Could not delete account')
                        } finally {
                          setDeleting(false)
                        }
                      }}
                      disabled={deleting}
                      className="bg-agni hover:bg-agni/90"
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Yes, delete my account'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleReset}>Reset to defaults</Button>
          <Button onClick={handleApply}>Apply changes</Button>
        </div>
      </div>
    </div>
  )
}

const PROVIDER_OPTIONS = [
  { value: 'bedrock', label: 'AWS Bedrock' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'groq', label: 'Groq' },
  { value: 'openai', label: 'OpenAI-compatible (custom)' },
]

function ProviderSlot({
  title, provider, model, apiKey, baseUrl, hasApiKey, onChange,
}: {
  title: string
  provider?: string
  model?: string
  apiKey?: string
  baseUrl?: string
  hasApiKey?: boolean
  onChange: (field: 'Provider' | 'Model' | 'ApiKey' | 'BaseUrl', value: string) => void
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{title}</span>
        <Select value={provider || ''} onValueChange={(v) => onChange('Provider', v)}>
          <SelectTrigger className="h-7 w-44 text-xs"><SelectValue placeholder="Choose provider" /></SelectTrigger>
          <SelectContent>
            {PROVIDER_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground flex items-center gap-1"><Key className="h-3 w-3" /> API Key</label>
        <Input
          type="password"
          value={apiKey || ''}
          onChange={(e) => onChange('ApiKey', e.target.value)}
          placeholder={hasApiKey ? '•••••••••••••••• (key set)' : 'Paste your API key here...'}
          className="h-8 text-xs font-mono"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground">Model ID</label>
        <Input
          value={model || ''}
          onChange={(e) => onChange('Model', e.target.value)}
          placeholder={provider === 'bedrock' ? 'amazon-bedrock/zai.glm-5' : provider === 'groq' ? 'llama-3.3-70b-versatile' : 'model-id'}
          className="h-8 text-xs font-mono"
        />
      </div>
      {provider === 'openai' && (
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">Base URL</label>
          <Input
            value={baseUrl || ''}
            onChange={(e) => onChange('BaseUrl', e.target.value)}
            placeholder="https://api.example.com/v1"
            className="h-8 text-xs font-mono"
          />
        </div>
      )}
    </div>
  )
}

function Row({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-[11px] text-muted-foreground">{desc}</div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function VoicePreviewButton({ voice }: { voice: string }) {
  const [playing, setPlaying] = useState(false)

  // Non-async: speechSynthesis.speak() must be called synchronously inside the
  // click handler or browsers (Safari, Chrome autoplay policy) will block it.
  const play = () => {
    if (playing) return
    setPlaying(true)
    const done = () => setPlaying(false)
    const text = 'Hello. I am Krishna, the intelligence layer of your Business OS.'
    const synth = window.speechSynthesis

    // ── 1. Start browser TTS immediately (synchronous — preserves user gesture) ──
    synth.cancel()
    fetch('/api/jarvis/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice, speed: 1.0, stability: 0.80, volume: 1.0 }),
      signal: AbortSignal.timeout(8000),
    }).then(async res => {
      if (!res.ok) throw new Error('TTS unavailable')
      const audio = new Audio(URL.createObjectURL(await res.blob()))
      audio.volume = 1
      audio.onended = () => { URL.revokeObjectURL(audio.src); done() }
      await audio.play()
    }).then(() => synth.cancel()).catch(() => {
      const fallback = new SpeechSynthesisUtterance(text)
      fallback.onend = done
      fallback.onerror = done
      synth.speak(fallback)
    })
    return

    const u = new SpeechSynthesisUtterance(text)
    u.volume = 1.0
    const isPocket = !voice.includes('-')
    const isFemale = isPocket
      ? /eve|anna|alba|estelle|lola/i.test(voice)
      : /Neerja|Emma|Ava|Sonia|Natasha|Swara/i.test(voice)
    const lang = isPocket ? 'en-US'
      : voice.startsWith('hi-IN') ? 'hi'
      : voice.startsWith('en-IN') ? 'en-IN'
      : voice.startsWith('en-GB') ? 'en-GB'
      : voice.startsWith('en-AU') ? 'en-AU' : 'en-US'
    const genderHint = isFemale ? 'female' : 'male'
    const allVoices = synth.getVoices()
    const pickVoice = (l: string) =>
      allVoices.find(v => v.lang.startsWith(l) && v.name.toLowerCase().includes(genderHint)) ||
      allVoices.find(v => v.lang.startsWith(l))
    const best = pickVoice(lang) || pickVoice('en-GB') || pickVoice('en') || allVoices[0] || null
    if (best) u.voice = best
    if (voice.startsWith('hi-IN'))      { u.rate = 0.88; u.pitch = isFemale ? 1.1  : 0.85 }
    else if (voice.startsWith('en-IN')) { u.rate = 0.90; u.pitch = isFemale ? 1.05 : 0.88 }
    else if (lang === 'en-GB')          { u.rate = 0.88; u.pitch = isFemale ? 1.0  : 0.80 }
    else if (voice.startsWith('en-AU')) { u.rate = 0.92; u.pitch = isFemale ? 1.05 : 0.85 }
    else                                { u.rate = 0.90; u.pitch = isFemale ? 1.05 : 0.82 }
    u.onend = done
    u.onerror = done
    synth.speak(u)

    // ── 2. Concurrently try server TTS — upgrades to neural voice if FastAPI is up ──
    fetch('/api/jarvis/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice, speed: 1.0, stability: 0.80, volume: 1.0 }),
      signal: AbortSignal.timeout(8000),
    }).then(async res => {
      if (!res.ok) return
      const buf = await res.arrayBuffer()
      synth.cancel() // stop browser TTS — neural voice takes over
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const audioBuffer = await audioCtx.decodeAudioData(buf)
      const source = audioCtx.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioCtx.destination)
      source.onended = () => { done(); audioCtx.close().catch(() => {}) }
      source.start(0)
    }).catch(() => { /* browser TTS already playing — no-op */ })
  }

  return (
    <Button variant="outline" size="sm" onClick={play} disabled={playing} className="h-9 w-9 p-0 flex-shrink-0">
      {playing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
    </Button>
  )
}

function ThemeButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-md border transition-colors ${
        active ? 'border-foreground bg-muted' : 'border-border hover:bg-muted/50'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="text-[10px]">{label}</span>
    </button>
  )
}
