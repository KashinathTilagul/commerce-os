'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Moon, Sun, Monitor, Cpu, Shield, Bell, Palette, Zap, Loader2, Key, ChevronDown } from 'lucide-react'
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
import { useEffect } from 'react'

export function Settings() {
  const { mode, accent, setMode, setAccent } = useThemeStore()
  const queryClient = useQueryClient()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const r = await fetch('/api/settings')
      if (!r.ok) throw new Error('Failed to fetch settings')
      return r.json()
    },
  })

  // Sync server theme settings to local zustand store initially
  useEffect(() => {
    if (settings && !isLoading) {
      if (settings.theme !== mode) setMode(settings.theme)
      if (settings.accent !== accent) setAccent(settings.accent)
    }
  }, [settings, isLoading, mode, accent, setMode, setAccent])

  const mutation = useMutation({
    mutationFn: async (updates: any) => {
      const r = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!r.ok) throw new Error('Failed to save settings')
      return r.json()
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['settings'], data)
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
    toast.success('Settings saved', 'All preferences are synced to the OS backend')
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

      <div className="px-4 lg:px-8 py-8 space-y-6 max-w-3xl">
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
                      borderColor: accent === c ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
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
            <p className="text-xs text-muted-foreground mt-1">Krishna is directly connected to AWS Bedrock Native Integration.</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground flex items-center gap-1"><Key className="h-3 w-3" /> AWS Bedrock API Key</label>
                <Input
                  type="password"
                  value={s.primaryApiKey || ''}
                  onChange={(e) => handleChange('primaryApiKey', e.target.value)}
                  placeholder="Paste your AWS Bedrock Base64 key here..."
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Model ID</label>
                <Input
                  value={s.primaryModel || ''}
                  onChange={(e) => handleChange('primaryModel', e.target.value)}
                  placeholder="amazon-bedrock/zai.glm-5"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
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

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleReset}>Reset to defaults</Button>
          <Button onClick={handleApply}>Apply changes</Button>
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
