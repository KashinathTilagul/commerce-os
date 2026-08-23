'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Moon, Sun, Monitor, Shield, Bell, Palette, Zap, Loader2, Trash2, AlertTriangle } from 'lucide-react'
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
  const orgNameTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const r = await fetch('/api/settings')
      if (!r.ok) throw new Error('Failed to fetch settings')
      return r.json()
    },
  })

  useEffect(() => {
    if (settings && !isLoading && settings.organizationName !== undefined) setOrgNameValue(settings.organizationName)
  }, [settings, isLoading])

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
