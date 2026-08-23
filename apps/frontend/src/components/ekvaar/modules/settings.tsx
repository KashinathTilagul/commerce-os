'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Moon, Sun, Monitor, Cpu, Shield, Bell, Palette, Zap, Loader2, Key, Mic, MessageSquare, Play, Trash2, AlertTriangle, Workflow } from 'lucide-react'
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
import { WORKABLE_VOICES, applyVoiceToUtterance, JARVIS_VOICE_ID } from '@/lib/voice-config'
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
import { LlmConnectionsSettings } from './llm-connections-settings'

export function Settings() {
  const { mode, accent, setMode, setAccent } = useThemeStore()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [promptValue, setPromptValue] = useState('')
  const promptTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [orgNameValue, setOrgNameValue] = useState('')
  const [providerDraft, setProviderDraft] = useState<Record<string, any>>({})
  const orgNameTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hasSyncedRef = useRef(false)
  // Local voice state — reads from localStorage first so it's instant even before server responds
  const [localVoice, setLocalVoice] = useState(() => {
    try { return localStorage.getItem('krishna_voice') || JARVIS_VOICE_ID } catch { return JARVIS_VOICE_ID }
  })
  const [localSpeed, setLocalSpeed] = useState(0.86)
  const speedOverriddenRef = useRef(false)

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
      if (settings.ttsVoice) setLocalVoice(settings.ttsVoice)
      if (settings.ttsSpeed !== undefined) setLocalSpeed(settings.ttsSpeed)
      if (settings.ttsSpeed !== undefined) localStorage.setItem('krishna_voice_speed', String(settings.ttsSpeed))
      if (settings.krishnaPrompt !== undefined) setPromptValue(settings.krishnaPrompt)
      if (settings.organizationName !== undefined) setOrgNameValue(settings.organizationName)
    }
  }, [settings, isLoading])

  useEffect(() => {
    if (localVoice === JARVIS_VOICE_ID && !speedOverriddenRef.current) {
      setLocalSpeed(0.86)
    }
  }, [localVoice])

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
      if (!r.ok) throw new Error((await r.text()) || 'Failed to save settings')
      return r.json()
    },
  })

  // Auto-save provider draft with debounce so changes don't require manual apply
  useEffect(() => {
    if (Object.keys(providerDraft).length === 0) return
    const timer = setTimeout(() => {
      mutation.mutate(providerDraft, {
        onSuccess: () => setProviderDraft({}),
      })
    }, 700)
    return () => clearTimeout(timer)
  }, [providerDraft, mutation])

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
            <LlmConnectionsSettings
              routes={[
                { provider: providerDraft.primaryProvider ?? s.primaryProvider, model: providerDraft.primaryModel ?? s.primaryModel },
                { provider: providerDraft.fallback1Provider ?? s.fallback1Provider, model: providerDraft.fallback1Model ?? s.fallback1Model },
                { provider: providerDraft.fallback2Provider ?? s.fallback2Provider, model: providerDraft.fallback2Model ?? s.fallback2Model },
              ]}
              onRouteChange={(index, provider, model) => {
                const prefix = index === 0 ? 'primary' : `fallback${index}`
                setProviderDraft((draft) => ({ ...draft, [`${prefix}Provider`]: provider, [`${prefix}Model`]: model }))
              }}
            />
            <Row label="Max token budget %" desc="Auto-pause agents at this threshold">
              <div className="w-56">
                <Slider value={[s.maxTokens ?? 80]} onValueChange={(v) => handleChange('maxTokens', v[0])} max={100} step={5} />
                <div className="text-right text-xs font-mono mt-1">{s.maxTokens ?? 80}%</div>
              </div>
            </Row>
          </CardContent>
        </Card>

        {/* Krishna LLM execution path */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display tracking-tight text-base flex items-center gap-2">
              <Workflow className="h-4 w-4" /> Krishna LLM Nodes
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Choose models visually in n8n. Ekvaar sends Krishna’s prompt to your internal workflow; provider credentials stay inside the model nodes.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Row label="Reasoning path" desc="Direct is fastest to configure; n8n Nodes lets you map and replace models visually">
              <Select
                value={providerDraft.krishnaLlmMode ?? s.krishnaLlmMode ?? 'direct'}
                onValueChange={(value) => setProviderDraft((draft) => ({ ...draft, krishnaLlmMode: value }))}
              >
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Direct · OmniRoute</SelectItem>
                  <SelectItem value="n8n_nodes">n8n Workflow Nodes</SelectItem>
                </SelectContent>
              </Select>
            </Row>

            {(providerDraft.krishnaLlmMode ?? s.krishnaLlmMode ?? 'direct') === 'n8n_nodes' && (
              <>
                <Row label="Webhook path" desc="Internal slug only; the default template uses krishna-llm-nodes">
                  <Input
                    value={providerDraft.krishnaN8nWebhookPath ?? s.krishnaN8nWebhookPath ?? 'krishna-llm-nodes'}
                    onChange={(event) => setProviderDraft((draft) => ({ ...draft, krishnaN8nWebhookPath: event.target.value }))}
                    className="w-64 font-mono text-xs"
                    placeholder="krishna-llm-nodes"
                  />
                </Row>
                <Row label="Direct fallback" desc="Use OmniRoute if the node workflow is unavailable or exceeds six seconds">
                  <Switch
                    checked={providerDraft.krishnaN8nFallback ?? s.krishnaN8nFallback ?? true}
                    onCheckedChange={(value) => setProviderDraft((draft) => ({ ...draft, krishnaN8nFallback: value }))}
                  />
                </Row>
                <div className="rounded-md border border-border bg-muted/30 p-3 text-[11px] text-muted-foreground space-y-2">
                  <p>Connect any n8n Chat Model node to “Krishna LLM”. The workflow must return JSON containing <code>spoken</code> and <code>action</code>.</p>
                  <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => window.open('/automation/', '_blank', 'noopener,noreferrer')}>
                    Open n8n node editor
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Composio event bridge */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display tracking-tight text-base flex items-center gap-2">
              <Zap className="h-4 w-4" /> Composio Event Bridge
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Connect applications with OAuth, then let signed Composio triggers create events inside this organization.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Row label="Composio API key" desc="Organization-owned; used to create connections and triggers">
              <Input
                type="password"
                value={providerDraft.composioApiKey ?? ''}
                onChange={(event) => setProviderDraft((draft) => ({ ...draft, composioApiKey: event.target.value }))}
                placeholder={s.hasComposioApiKey ? 'Composio API key saved' : 'Paste Composio API key'}
                autoComplete="off"
                className="w-80 font-mono text-xs"
              />
            </Row>
            <Row label="Webhook signing secret" desc="Required to reject forged trigger events">
              <Input
                type="password"
                value={providerDraft.composioWebhookSecret ?? ''}
                onChange={(event) => setProviderDraft((draft) => ({ ...draft, composioWebhookSecret: event.target.value }))}
                placeholder={s.hasComposioWebhookSecret ? 'Webhook secret saved' : 'Paste Composio webhook secret'}
                autoComplete="off"
                className="w-80 font-mono text-xs"
              />
            </Row>
            <Row label="Webhook endpoint" desc="Register this URL in the Composio project">
              <code className="rounded border border-border bg-muted px-2 py-1 text-xs">/api/webhooks/composio</code>
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
            <p className="text-xs text-muted-foreground mt-1">Deepgram Flux streaming STT and TTS, with the local voice sidecar as fallback. No OpenAI or Codex credits are used.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Row label="Voice engine" desc="Organization-owned key; never exposed to the browser">
              <div className="flex items-center gap-2">
                <Select
                  value={providerDraft.speechProvider ?? s.speechProvider ?? 'deepgram'}
                  onValueChange={(value) => setProviderDraft((draft) => ({ ...draft, speechProvider: value }))}
                >
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deepgram">Deepgram Flux</SelectItem>
                    <SelectItem value="local">Local fallback</SelectItem>
                  </SelectContent>
                </Select>
                {(providerDraft.speechProvider ?? s.speechProvider ?? 'deepgram') === 'deepgram' && (
                  <Input
                    type="password"
                    value={providerDraft.speechApiKey ?? ''}
                    onChange={(event) => setProviderDraft((draft) => ({ ...draft, speechApiKey: event.target.value }))}
                    placeholder={s.hasSpeechApiKey ? 'Deepgram key saved' : 'Paste Deepgram API key'}
                    autoComplete="off"
                    className="w-60 font-mono text-xs"
                  />
                )}
              </div>
            </Row>
            <Row label="Voice" desc="Krishna's speaking voice">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Badge
                    onClick={() => {
                      setLocalVoice(JARVIS_VOICE_ID)
                      try { localStorage.setItem('krishna_voice', JARVIS_VOICE_ID) } catch {}
                      handleChange('ttsVoice', JARVIS_VOICE_ID)
                    }}
                    className="cursor-pointer bg-cyan-500/10 text-cyan-300 border-cyan-400/30 shadow-[0_0_14px_rgba(34,211,238,0.35)]"
                  >
                    ⭐ JARVIS Preset
                  </Badge>
                  <Select
                    value={localVoice}
                    onValueChange={(v) => {
                      setLocalVoice(v)
                      // Save to localStorage immediately — works even if server save fails
                      try { localStorage.setItem('krishna_voice', v) } catch {}
                      handleChange('ttsVoice', v)
                    }}
                  >
                    <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {WORKABLE_VOICES.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <VoicePreviewButton voice={localVoice} />
                </div>
              </div>
            </Row>

            <Row label="Voice Speed" desc="How deliberate Krishna sounds (0.85–1.15)">
              <div className="w-56">
                <Slider
                  value={[localSpeed]}
                  onValueChange={(v) => {
                    speedOverriddenRef.current = true
                    setLocalSpeed(v[0])
                    try { localStorage.setItem('krishna_voice_speed', String(v[0])) } catch {}
                    handleChange('ttsSpeed', v[0])
                  }}
                  min={0.85}
                  max={1.15}
                  step={0.05}
                />
                <div className="text-right text-xs font-mono mt-1">{localSpeed.toFixed(2)}</div>
              </div>
            </Row>

            <Row label="Turn taking" desc="Flux detects when you finish and supports natural interruption">
              <Badge variant="outline" className="border-emerald-400/30 text-emerald-300">Live · multilingual</Badge>
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
  { value: 'omniroute', label: 'OmniRoute Gateway' },
]

const PROVIDER_MODELS: Record<string, { value: string; label: string; vision?: boolean }[]> = {
  omniroute: [
    { value: 'auto/best-free', label: 'Best Free (recommended)' },
    { value: 'auto/best-fast', label: 'Best Fast' },
    { value: 'auto/gemini', label: 'Best Gemini' },
    { value: 'auto', label: 'Auto Balanced' },
    { value: 'auto/fast', label: 'Auto Fast' },
    { value: 'auto/cheap', label: 'Auto Cheapest' },
    { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet (vision)', vision: true },
    { value: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku (vision)', vision: true },
    { value: 'google/gemini-1.5-pro', label: 'Gemini 1.5 Pro (vision)', vision: true },
    { value: 'google/gemini-1.5-flash', label: 'Gemini 1.5 Flash (vision)', vision: true },
    { value: 'google/gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (vision)', vision: true },
    { value: 'openai/gpt-4o', label: 'GPT-4o (vision)', vision: true },
    { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini (vision)', vision: true },
    { value: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (free)' },
    { value: 'meta-llama/llama-3.1-8b-instruct:free', label: 'Llama 3.1 8B (free)' },
    { value: 'google/gemma-3-27b-it:free', label: 'Gemma 3 27B (free)' },
  ],
}

function ProviderSlot({
  title, provider, model, apiKey, hasApiKey, onChange,
}: {
  title: string
  provider?: string
  model?: string
  apiKey?: string
  hasApiKey?: boolean
  onChange: (field: 'Provider' | 'Model' | 'ApiKey', value: string) => void
}) {
  const [customModel, setCustomModel] = useState(model || '')
  const [showCustomModel, setShowCustomModel] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const availableModels = provider ? (PROVIDER_MODELS[provider] || []) : []

  const debouncedSave = (field: 'Provider' | 'Model' | 'ApiKey', value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onChange(field, value), 600)
  }

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{title}</span>
        <Select value={provider || ''} onValueChange={(v) => { onChange('Provider', v); setShowCustomModel(false) }}>
          <SelectTrigger className="h-7 w-44 text-xs"><SelectValue placeholder="Choose provider" /></SelectTrigger>
          <SelectContent>
            {PROVIDER_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Key className="h-3 w-3" /> API Key
          {hasApiKey && !apiKey && (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 ml-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> configured
            </span>
          )}
        </label>
        <Input
          type="password"
          value={apiKey || ''}
          onChange={(e) => debouncedSave('ApiKey', e.target.value)}
          onBlur={() => { if (debounceRef.current) clearTimeout(debounceRef.current); onChange('ApiKey', apiKey || '') }}
          placeholder={hasApiKey ? 'Key configured — paste to replace' : 'Paste your API key here...'}
          className="h-8 text-xs font-mono"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground">Model</label>
        {provider && !showCustomModel ? (
          <div className="flex gap-2">
            <Select
              value={availableModels.some(m => m.value === model) ? model || '' : '__custom__'}
              onValueChange={(v) => {
                if (v === '__custom__') {
                  setShowCustomModel(true)
                } else {
                  setCustomModel(v)
                  onChange('Model', v)
                }
              }}
            >
              <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue placeholder="Choose model" /></SelectTrigger>
              <SelectContent>
                {availableModels.map(m => (
                  <SelectItem key={m.value} value={m.value}>
                    <span className="flex items-center gap-2">
                      {m.label}
                      {m.vision && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-400/20 text-emerald-300">vision</span>}
                    </span>
                  </SelectItem>
                ))}
                <SelectItem value="__custom__">Custom model ID...</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              value={customModel || model || ''}
              onChange={(e) => { setCustomModel(e.target.value); debouncedSave('Model', e.target.value) }}
              onBlur={() => { setShowCustomModel(false); onChange('Model', customModel || model || '') }}
              placeholder={'anthropic/claude-3.5-sonnet'}
              className="h-8 text-xs font-mono flex-1"
            />
            {provider && availableModels.length > 0 && (
              <Button variant="outline" size="sm" className="h-8 text-[10px]" onClick={() => { setShowCustomModel(false); setCustomModel(model || '') }}>
                Browse
              </Button>
            )}
          </div>
        )}
      </div>
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

  const play = () => {
    if (playing) return
    setPlaying(true)
    const done = () => setPlaying(false)
    const text = 'Hello. I am Krishna, the intelligence layer of your Business OS.'
    const synth = window.speechSynthesis

    synth.cancel()

    // ── 1. Try server neural voice ──
    fetch('/api/jarvis/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice, speed: 1.0, volume: 1.0 }),
      signal: AbortSignal.timeout(4000),
    }).then(async res => {
      if (!res.ok) throw new Error('Neural TTS unavailable')
      const audio = new Audio(URL.createObjectURL(await res.blob()))
      audio.volume = 1
      audio.onended = () => { URL.revokeObjectURL(audio.src); done() }
      audio.onerror = () => done()
      await audio.play()
    }).catch(() => {
      // ── 2. Fallback to browser SpeechSynthesis tuned to selected voice ──
      const u = new SpeechSynthesisUtterance(text)
      applyVoiceToUtterance(u, synth, voice)
      u.onend = done
      u.onerror = done
      synth.speak(u)
    })
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
