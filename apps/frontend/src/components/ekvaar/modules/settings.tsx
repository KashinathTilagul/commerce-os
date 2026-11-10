'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Moon, Sun, Monitor, Shield, Bell, Palette, Zap, Loader2, Trash2, AlertTriangle, Save, Image as ImageIcon, CheckCircle2, Cpu } from 'lucide-react'
import { PageHeader } from '../shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
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
  const [orgNameValue, setOrgNameValue] = useState('')
  const [providerDraft, setProviderDraft] = useState<Record<string, any>>({})
  const [selectedImageModel, setSelectedImageModel] = useState('')
  const [imageTestUrl, setImageTestUrl] = useState('')
  const [aiTestResult, setAiTestResult] = useState<{ ok: boolean; text: string } | null>(null)
  const orgNameTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const r = await fetch('/api/settings')
      if (!r.ok) throw new Error('Failed to fetch settings')
      return r.json()
    },
  })

  const { data: serviceHealth, isLoading: serviceHealthLoading } = useQuery({
    queryKey: ['system-services'],
    queryFn: async () => {
      const response = await fetch('/api/system/services', { cache: 'no-store' })
      if (!response.ok) throw new Error('Failed to check connected services')
      return response.json() as Promise<{
        services: Array<{ name: string; configured: boolean; healthy: boolean; status?: number; latencyMs?: number }>
        checkedAt: string
      }>
    },
    refetchInterval: 60_000,
  })

  const { data: imageModels, isLoading: imageModelsLoading, error: imageModelsError } = useQuery({
    queryKey: ['omniroute-image-models'],
    queryFn: async () => {
      const response = await fetch('/api/omniroute/images', { cache: 'no-store' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not load image models')
      return data as { models: Array<{ id: string; name: string; sizes: string[] }>; selectedModel: string }
    },
    retry: false,
  })

  useEffect(() => {
    if (settings && !isLoading && settings.organizationName !== undefined) setOrgNameValue(settings.organizationName)
  }, [settings, isLoading])

  useEffect(() => {
    if (!imageModels?.models?.length) return
    const verified = imageModels.models.some((model) => model.id === imageModels.selectedModel)
    setSelectedImageModel(verified ? imageModels.selectedModel : imageModels.models[0].id)
  }, [imageModels])

  // Cleanup debounce timeout
  useEffect(() => {
    return () => {
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

  const imageModelMutation = useMutation({
    mutationFn: async (modelId: string) => {
      const response = await fetch('/api/omniroute/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Image test failed')
      return data as { modelId: string; imageUrl: string }
    },
    onSuccess: (data) => {
      setImageTestUrl(data.imageUrl)
      queryClient.invalidateQueries({ queryKey: ['omniroute-image-models'] })
      toast.success('Image model verified', data.modelId)
    },
    onError: (error: Error) => toast.error('Image model failed', error.message),
  })

  const aiTestMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/settings/test-ai', { method: 'POST' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'AI provider test failed')
      return data as { ok: boolean; provider: string; model: string; reply: string }
    },
    onSuccess: (data) => {
      setAiTestResult({ ok: true, text: `${data.provider} · ${data.model}` })
      toast.success('AI model connected', `${data.provider} · ${data.model}`)
    },
    onError: (error: Error) => {
      setAiTestResult({ ok: false, text: error.message })
      toast.error('AI model failed', error.message)
    },
  })

  const handleSaveCredentials = () => {
    if (Object.keys(providerDraft).length === 0) return
    mutation.mutate(providerDraft, {
      onSuccess: () => {
        setProviderDraft({})
        queryClient.invalidateQueries({ queryKey: ['settings'] })
        queryClient.invalidateQueries({ queryKey: ['system-services'] })
        toast.success('Settings saved')
      },
      onError: (error: any) => toast.error('Save failed', error?.message || 'Could not save settings'),
    })
  }

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
        description="Global configuration for appearance, notifications, integrations, and governance thresholds."
      />

      <div className="px-6 lg:px-10 py-8 space-y-6">
        <div className="sticky top-0 z-20 flex items-center justify-between rounded-xl border border-border bg-background/95 px-4 py-3 shadow-lg backdrop-blur">
          <div>
            <div className="text-sm font-medium">Settings</div>
            <div className="text-[11px] text-muted-foreground">
              {Object.keys(providerDraft).length > 0 ? 'You have unsaved credential changes.' : 'Saved. Appearance and preference controls apply immediately.'}
            </div>
          </div>
          <Button onClick={handleSaveCredentials} disabled={Object.keys(providerDraft).length === 0 || mutation.isPending}>
            {mutation.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
            {mutation.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>

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

        {/* AI Models & Providers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display tracking-tight text-base flex items-center gap-2">
              <Cpu className="h-4 w-4" /> AI Models & Providers
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Configure organization-owned LLM credentials used by Chat, Workforce agents, Content Studio, and Analyst.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Row label="Primary provider" desc="Model provider used first across AI workflows">
              <Select
                value={providerDraft.primaryProvider ?? (s.primaryProvider || 'openai')}
                onValueChange={(value) => setProviderDraft((draft) => ({ ...draft, primaryProvider: value }))}
              >
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                  <SelectItem value="groq">Groq</SelectItem>
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
                  <SelectItem value="omniroute">OmniRoute Gateway</SelectItem>
                  <SelectItem value="ollama">Ollama (Local)</SelectItem>
                </SelectContent>
              </Select>
            </Row>
            <Row label="Primary model ID" desc="Exact model identifier (e.g. gpt-4o-mini, claude-3-5-sonnet-latest, gemini-2.5-flash)">
              <Input
                value={providerDraft.primaryModel ?? (s.primaryModel || '')}
                onChange={(event) => setProviderDraft((draft) => ({ ...draft, primaryModel: event.target.value }))}
                placeholder="gpt-4o-mini"
                className="w-80 font-mono text-xs"
              />
            </Row>
            <Row label="Primary API key" desc="Encrypted at rest; optional for local Ollama">
              <Input
                type="password"
                value={providerDraft.primaryApiKey ?? ''}
                onChange={(event) => setProviderDraft((draft) => ({ ...draft, primaryApiKey: event.target.value }))}
                placeholder={s.hasPrimaryApiKey ? 'API key saved (enter new key to replace)' : 'Paste provider API key'}
                autoComplete="off"
                className="w-80 font-mono text-xs"
              />
            </Row>
            <Row label="Primary base URL (optional)" desc="Leave blank to use the selected provider's official endpoint">
              <Input
                value={providerDraft.primaryBaseUrl ?? (s.primaryBaseUrl || '')}
                onChange={(event) => setProviderDraft((draft) => ({ ...draft, primaryBaseUrl: event.target.value }))}
                placeholder="https://api.openai.com/v1"
                className="w-80 font-mono text-xs"
              />
            </Row>
            <div className="border-t border-border/60 pt-4 space-y-4">
              <Row label="Fallback provider (optional)" desc="Tried automatically if the primary provider errors">
                <Select
                  value={providerDraft.fallback1Provider ?? (s.fallback1Provider || 'none')}
                  onValueChange={(value) => setProviderDraft((draft) => ({ ...draft, fallback1Provider: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                    <SelectItem value="groq">Groq</SelectItem>
                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                    <SelectItem value="omniroute">OmniRoute Gateway</SelectItem>
                    <SelectItem value="ollama">Ollama (Local)</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
              {(providerDraft.fallback1Provider ?? s.fallback1Provider) ? (
                <>
                  <Row label="Fallback model ID" desc="Model used when primary fails">
                    <Input
                      value={providerDraft.fallback1Model ?? (s.fallback1Model || '')}
                      onChange={(event) => setProviderDraft((draft) => ({ ...draft, fallback1Model: event.target.value }))}
                      placeholder="llama-3.3-70b-versatile"
                      className="w-80 font-mono text-xs"
                    />
                  </Row>
                  <Row label="Fallback API key" desc="Encrypted at rest">
                    <Input
                      type="password"
                      value={providerDraft.fallback1ApiKey ?? ''}
                      onChange={(event) => setProviderDraft((draft) => ({ ...draft, fallback1ApiKey: event.target.value }))}
                      placeholder={s.hasFallback1ApiKey ? 'Fallback API key saved' : 'Paste fallback API key'}
                      autoComplete="off"
                      className="w-80 font-mono text-xs"
                    />
                  </Row>
                </>
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
              <div className="min-w-0 text-xs">
                {aiTestResult ? (
                  <span className={aiTestResult.ok ? 'text-arav font-medium' : 'text-agni font-medium'}>
                    {aiTestResult.ok ? `Connected: ${aiTestResult.text}` : aiTestResult.text}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Save changes first, then verify live completion.</span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => aiTestMutation.mutate()}
                disabled={aiTestMutation.isPending || Object.keys(providerDraft).length > 0}
              >
                {aiTestMutation.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Zap className="mr-2 h-3.5 w-3.5" />}
                {aiTestMutation.isPending ? 'Testing…' : 'Test AI connection'}
              </Button>
            </div>
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

        {/* Image generation */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display tracking-tight text-base flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> Image generation
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Only image models currently returned by OmniRoute are selectable. A real image must succeed before the model is saved.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {imageModelsLoading ? (
              <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading connected image models…
              </div>
            ) : imageModelsError ? (
              <div className="rounded-lg border border-agni/30 bg-agni/5 p-3 text-xs text-agni">
                {(imageModelsError as Error).message}
              </div>
            ) : imageModels?.models?.length ? (
              <>
                <Row label="Image model" desc="Verified against OmniRoute's dedicated image catalog">
                  <Select value={selectedImageModel} onValueChange={setSelectedImageModel}>
                    <SelectTrigger className="w-80"><SelectValue placeholder="Select an image model" /></SelectTrigger>
                    <SelectContent>
                      {imageModels.models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Row>
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {imageTestUrl ? (
                      <img src={imageTestUrl} alt="Verified image model output" className="h-16 w-16 rounded-md object-cover" />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-md bg-muted"><ImageIcon className="h-5 w-5 text-muted-foreground" /></div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {imageModels.selectedModel && imageModels.models.some((model) => model.id === imageModels.selectedModel) ? <CheckCircle2 className="h-4 w-4 text-arav" /> : <AlertTriangle className="h-4 w-4 text-amber-400" />}
                        {imageModels.selectedModel && imageModels.models.some((model) => model.id === imageModels.selectedModel) ? 'Verified model active' : 'Test required'}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">{imageModels.selectedModel || 'No image model has passed a live test.'}</div>
                    </div>
                  </div>
                  <Button
                    onClick={() => imageModelMutation.mutate(selectedImageModel)}
                    disabled={!selectedImageModel || imageModelMutation.isPending}
                  >
                    {imageModelMutation.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Zap className="mr-2 h-3.5 w-3.5" />}
                    {imageModelMutation.isPending ? 'Generating test…' : 'Test & use model'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground">OmniRoute returned no connected image models.</div>
            )}
          </CardContent>
        </Card>

        {/* Connected services */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display tracking-tight text-base flex items-center gap-2">
              <Zap className="h-4 w-4" /> Connected Services
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Live checks from the deployed service endpoints.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {serviceHealthLoading && (
              <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking services…
              </div>
            )}
            {!serviceHealthLoading && (serviceHealth?.services || []).map((service) => {
              const label = !service.configured ? 'NOT CONFIGURED' : service.healthy ? 'LIVE' : 'UNHEALTHY'
              const color = !service.configured ? 'text-muted-foreground' : service.healthy ? 'text-arav' : 'text-agni'
              const dot = !service.configured ? 'bg-muted-foreground' : service.healthy ? 'bg-arav' : 'bg-agni'
              return (
                <div key={service.name} className="flex items-center justify-between py-2 border-b border-border/60 last:border-0">
                  <div>
                    <div className="text-sm font-medium">{service.name}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">
                      {service.configured && service.latencyMs !== undefined ? `${service.latencyMs} ms` : 'No endpoint configured'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${dot} ${service.healthy ? 'animate-pulse-soft' : ''}`} />
                    <span className={`text-[10px] tracking-wider uppercase ${color}`}>{label}</span>
                  </div>
                </div>
              )
            })}
            {!serviceHealthLoading && !serviceHealth?.services?.length && (
              <div className="py-3 text-xs text-muted-foreground">Service health is unavailable.</div>
            )}
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

        <div className="flex justify-end">
          <Button variant="outline" onClick={handleReset}>Reset to defaults</Button>
        </div>
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
