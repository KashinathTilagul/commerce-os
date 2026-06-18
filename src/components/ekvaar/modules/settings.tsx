'use client'

import { useState } from 'react'
import { Moon, Sun, Monitor, Cpu, Shield, Bell, Globe, Palette, Zap } from 'lucide-react'
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

export function Settings() {
  const { mode, accent, setMode, setAccent } = useThemeStore()
  const [notifications, setNotifications] = useState(true)
  const [agentHeartbeats, setAgentHeartbeats] = useState(true)
  const [approvalAlerts, setApprovalAlerts] = useState(true)
  const [budgetAlerts, setBudgetAlerts] = useState(true)
  const [maxTokens, setMaxTokens] = useState([80])
  const [intelligence, setIntelligence] = useState('claude-sonnet')
  const [autoApprove, setAutoApprove] = useState('5000')
  const [escalation, setEscalation] = useState('standard')

  const handleThemeChange = (newMode: 'dark' | 'light' | 'auto') => {
    setMode(newMode)
    toast.success('Theme applied', `${newMode.charAt(0).toUpperCase() + newMode.slice(1)} mode active`)
  }

  const handleAccentChange = (color: string) => {
    setAccent(color)
    toast.success('Accent color updated')
  }

  const handleApply = () => {
    toast.success('Settings saved', 'All preferences applied system-wide')
  }

  const handleReset = () => {
    setMode('dark')
    setAccent('#C8302A')
    setNotifications(true)
    setAgentHeartbeats(true)
    setApprovalAlerts(true)
    setBudgetAlerts(true)
    setMaxTokens([80])
    setIntelligence('claude-sonnet')
    toast.info('Reset to defaults')
  }

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
                <ThemeButton active={mode === 'light'} onClick={() => handleThemeChange('light')} icon={Sun} label="Light" />
                <ThemeButton active={mode === 'dark'} onClick={() => handleThemeChange('dark')} icon={Moon} label="Dark" />
                <ThemeButton active={mode === 'auto'} onClick={() => handleThemeChange('auto')} icon={Monitor} label="Auto" />
              </div>
            </Row>
            <Row label="Accent color" desc="System highlight color">
              <div className="flex gap-2">
                {['#C8302A', '#1F3A5F', '#2F4F3A', '#D4859B', '#FF9500', '#8B7355'].map((c) => (
                  <button
                    key={c}
                    onClick={() => handleAccentChange(c)}
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

        {/* Intelligence Layer */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display tracking-tight text-base flex items-center gap-2">
              <Cpu className="h-4 w-4" /> Intelligence Layer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Row label="Primary model" desc="Routing target for all LLM calls">
              <Select value={intelligence} onValueChange={setIntelligence}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude-sonnet">Claude Sonnet 4.5</SelectItem>
                  <SelectItem value="claude-opus">Claude Opus 4</SelectItem>
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="glm-4">GLM-4</SelectItem>
                  <SelectItem value="local">Local (Ollama)</SelectItem>
                </SelectContent>
              </Select>
            </Row>
            <Row label="API endpoint" desc="Intelligence layer gateway URL">
              <Input defaultValue="http://localhost:8000/api/v1/intelligence" className="w-72 font-mono text-xs" />
            </Row>
            <Row label="Max token budget %" desc="Auto-pause agents at this threshold">
              <div className="w-56">
                <Slider value={maxTokens} onValueChange={setMaxTokens} max={100} step={5} />
                <div className="text-right text-xs font-mono mt-1">{maxTokens[0]}%</div>
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
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </Row>
            <Row label="Agent heartbeats" desc="Notify when agents wake or complete tasks">
              <Switch checked={agentHeartbeats} onCheckedChange={setAgentHeartbeats} />
            </Row>
            <Row label="Approval requests" desc="Surface inbox items needing founder action">
              <Switch checked={approvalAlerts} onCheckedChange={setApprovalAlerts} />
            </Row>
            <Row label="Budget alerts" desc="Warn at 80% token spend">
              <Switch checked={budgetAlerts} onCheckedChange={setBudgetAlerts} />
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
                value={`₹${autoApprove}`}
                onChange={(e) => setAutoApprove(e.target.value.replace(/[^\d]/g, ''))}
                className="w-32 font-mono text-xs"
              />
            </Row>
            <Row label="Board approval required" desc="Strategic actions needing founder sign-off">
              <Badge variant="outline">Hiring · Campaigns · Budget reallocation</Badge>
            </Row>
            <Row label="Escalation policy" desc="When to surface to founder inbox">
              <Select value={escalation} onValueChange={setEscalation}>
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
