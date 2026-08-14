'use client'

import { useState } from 'react'
import { GlassPanel } from '@/components/ui/glass-system'
import { Save, Loader2, Mic } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ekvaar/desktop/toast'

export function ConfigurationTab({ agent }: { agent: any }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState(agent.status || 'IDLE')
  const [avatarColor, setAvatarColor] = useState(agent.avatarColor || '#1F3A5F')
  const [voiceEnabled, setVoiceEnabled] = useState(agent.voiceEnabled ?? true)
  const [voiceProvider, setVoiceProvider] = useState(agent.voiceProvider || 'dograh')
  const [voiceId, setVoiceId] = useState(agent.voiceId || 'auto')
  const [voiceLanguage, setVoiceLanguage] = useState(agent.voiceLanguage || 'en-IN')
  const [voiceSpeed, setVoiceSpeed] = useState(agent.voiceSpeed || 1)
  const [dograhAssistantId, setDograhAssistantId] = useState(agent.dograhAssistantId || '')

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to save configuration')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Agent configuration saved')
      queryClient.invalidateQueries({ queryKey: ['workforce-agent', agent.id] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Save failed')
    },
  })

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-base tracking-tight">Agent Configuration & Runtime Settings</h2>
          <p className="text-[11px] text-muted-foreground">
            Configure execution policies, wake triggers, and runtime parameters
          </p>
        </div>
        <button
          onClick={() => updateMutation.mutate({ status, avatarColor, voiceEnabled, voiceProvider, voiceId, voiceLanguage, voiceSpeed, dograhAssistantId })}
          disabled={updateMutation.isPending}
          className="glass-l2 flex h-7 items-center gap-1.5 px-3 text-[11px] font-medium text-foreground rounded-md hover:bg-white/[0.12] transition-colors disabled:opacity-40"
        >
          {updateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Save Settings
        </button>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {/* Status */}
        <GlassPanel level={2} className="rounded-xl p-5 space-y-3">
          <label className="text-[10px] font-medium tracking-[0.12em] uppercase text-muted-foreground">
            Agent Status State
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full h-9 rounded-lg bg-black/40 px-3 text-[12px] text-foreground outline-none border border-white/[0.06]"
          >
            <option value="IDLE">IDLE (Active & ready for heartbeats)</option>
            <option value="PAUSED">PAUSED (Manual pause / budget limit)</option>
            <option value="OFFLINE">OFFLINE (Disabled)</option>
          </select>
        </GlassPanel>

        {/* Avatar Color */}
        <GlassPanel level={2} className="rounded-xl p-5 space-y-3">
          <label className="text-[10px] font-medium tracking-[0.12em] uppercase text-muted-foreground">
            Avatar Brand Accent
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={avatarColor}
              onChange={(e) => setAvatarColor(e.target.value)}
              className="h-9 w-12 rounded bg-transparent border-0 cursor-pointer"
            />
            <span className="font-mono text-[12px]">{avatarColor}</span>
          </div>
        </GlassPanel>

        {/* Runtime Provider */}
        <GlassPanel level={2} className="rounded-xl p-5 space-y-2">
          <label className="text-[10px] font-medium tracking-[0.12em] uppercase text-muted-foreground">
            Preferred AI Model Router Tier
          </label>
          <div className="text-[12px] font-medium text-foreground">Auto Reasoning Chain</div>
          <div className="text-[10px] text-muted-foreground">AWS Bedrock → OpenRouter → Groq → OpenAI</div>
        </GlassPanel>

        {/* Wake Triggers */}
        <GlassPanel level={2} className="rounded-xl p-5 space-y-2">
          <label className="text-[10px] font-medium tracking-[0.12em] uppercase text-muted-foreground">
            Event Wake Triggers
          </label>
          <div className="text-[11px] text-foreground space-y-1">
            <div>✓ Wake on Issue Assignment</div>
            <div>✓ Wake on @Mention</div>
            <div>✓ Wake on Governance Approval</div>
          </div>
        </GlassPanel>
      </div>

      <GlassPanel level={2} className="rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 font-display text-sm"><Mic className="h-4 w-4 text-cyan-300" /> Human Voice</h3>
            <p className="mt-1 text-[10px] text-muted-foreground">Dograh provides realtime speech; Ekvaar keeps this employee's voice identity and permissions.</p>
          </div>
          <label className="flex items-center gap-2 text-[11px]">
            <input type="checkbox" checked={voiceEnabled} onChange={(event) => setVoiceEnabled(event.target.checked)} className="h-4 w-4 accent-cyan-400" />
            Voice enabled
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Provider
            <select value={voiceProvider} onChange={(event) => setVoiceProvider(event.target.value)} className="h-9 w-full rounded-lg border border-white/[0.06] bg-black/40 px-3 text-[12px] normal-case tracking-normal text-foreground">
              <option value="dograh">Dograh realtime voice</option>
              <option value="browser">Browser voice fallback</option>
            </select>
          </label>
          <label className="space-y-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Language
            <select value={voiceLanguage} onChange={(event) => setVoiceLanguage(event.target.value)} className="h-9 w-full rounded-lg border border-white/[0.06] bg-black/40 px-3 text-[12px] normal-case tracking-normal text-foreground">
              <option value="en-IN">Indian English</option>
              <option value="hi-IN">Hindi</option>
              <option value="en-GB">British English</option>
              <option value="en-US">US English</option>
            </select>
          </label>
          <label className="space-y-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Voice ID
            <input value={voiceId} onChange={(event) => setVoiceId(event.target.value)} placeholder="auto" className="h-9 w-full rounded-lg border border-white/[0.06] bg-black/40 px-3 text-[12px] normal-case tracking-normal text-foreground" />
          </label>
          <label className="space-y-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Dograh assistant ID
            <input value={dograhAssistantId} onChange={(event) => setDograhAssistantId(event.target.value)} placeholder="Assigned after voice-agent creation" className="h-9 w-full rounded-lg border border-white/[0.06] bg-black/40 px-3 text-[12px] normal-case tracking-normal text-foreground" />
          </label>
          <label className="space-y-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground md:col-span-2">Speaking speed · {voiceSpeed.toFixed(2)}×
            <input type="range" min="0.5" max="1.5" step="0.05" value={voiceSpeed} onChange={(event) => setVoiceSpeed(Number(event.target.value))} className="w-full accent-cyan-400" />
          </label>
        </div>
      </GlassPanel>
    </div>
  )
}
