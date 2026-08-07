'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { GlassPanel } from '@/components/ui/glass-system'
import { Settings as SettingsIcon, ShieldCheck, Save, Loader2, Zap } from 'lucide-react'
import { DEFAULT_POLICY_REGISTRY } from '@/lib/agents/governance/policy-registry'
import { toast } from '@/components/ekvaar/desktop/toast'

export function WorkforceSettings() {
  const queryClient = useQueryClient()
  const [policies, setPolicies] = useState(DEFAULT_POLICY_REGISTRY)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['workforce-settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings')
      if (!res.ok) return {}
      return res.json()
    },
  })

  const [agentHeartbeats, setAgentHeartbeats] = useState(true)
  const [approvalAlerts, setApprovalAlerts] = useState(true)
  const [budgetAlerts, setBudgetAlerts] = useState(true)
  const [autoApproveLimit, setAutoApproveLimit] = useState('5000')

  useEffect(() => {
    if (settings) {
      if (settings.agentHeartbeats !== undefined) setAgentHeartbeats(Boolean(settings.agentHeartbeats))
      if (settings.approvalAlerts !== undefined) setApprovalAlerts(Boolean(settings.approvalAlerts))
      if (settings.budgetAlerts !== undefined) setBudgetAlerts(Boolean(settings.budgetAlerts))
      if (settings.autoApproveLimit !== undefined) setAutoApproveLimit(String(settings.autoApproveLimit))
    }
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to save settings')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Workforce settings saved')
      queryClient.invalidateQueries({ queryKey: ['workforce-settings'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Save failed')
    },
  })

  const handlePolicyChange = (category: string, decision: 'ALLOW' | 'REQUIRE_APPROVAL' | 'DENY') => {
    setPolicies((prev) => ({
      ...prev,
      [category]: { ...prev[category], decision },
    }))
    toast.success(`Updated ${category} → ${decision}`)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
        <div>
          <h1 className="font-display text-xl tracking-tight">Workforce Settings & Governance</h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Configure system-wide runtime defaults, action policy registry, and approval thresholds
          </p>
        </div>

        <button
          onClick={() =>
            saveMutation.mutate({
              agentHeartbeats,
              approvalAlerts,
              budgetAlerts,
              autoApproveLimit: parseFloat(autoApproveLimit) || 5000,
            })
          }
          disabled={saveMutation.isPending}
          className="glass-l2 flex h-8 items-center gap-1.5 rounded-md px-4 text-[11px] font-medium text-foreground hover:bg-white/[0.12] disabled:opacity-40 transition-colors"
        >
          {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save Settings
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Runtime Toggles & Limits */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <GlassPanel level={2} className="rounded-xl p-5 space-y-4">
                <h3 className="font-display text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-400" />
                  Runtime Automation & Triggers
                </h3>

                <div className="space-y-3 text-[12px]">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span>Automatic Event Heartbeats</span>
                    <input
                      type="checkbox"
                      checked={agentHeartbeats}
                      onChange={(e) => setAgentHeartbeats(e.target.checked)}
                      className="h-4 w-4 accent-emerald-500 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span>Governance Approval Alerts</span>
                    <input
                      type="checkbox"
                      checked={approvalAlerts}
                      onChange={(e) => setApprovalAlerts(e.target.checked)}
                      className="h-4 w-4 accent-emerald-500 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span>Budget Warning & Hard Cap Alerts</span>
                    <input
                      type="checkbox"
                      checked={budgetAlerts}
                      onChange={(e) => setBudgetAlerts(e.target.checked)}
                      className="h-4 w-4 accent-emerald-500 rounded"
                    />
                  </label>
                </div>
              </GlassPanel>

              <GlassPanel level={2} className="rounded-xl p-5 space-y-4">
                <h3 className="font-display text-sm flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-amber-400" />
                  Governance Thresholds
                </h3>

                <div className="space-y-2">
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Auto-Approve Spend Ceiling (INR)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-muted-foreground">₹</span>
                    <input
                      type="number"
                      value={autoApproveLimit}
                      onChange={(e) => setAutoApproveLimit(e.target.value)}
                      className="w-full h-8 rounded-lg bg-black/40 px-3 text-[12px] text-foreground font-mono outline-none border border-white/[0.06]"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Action requests below this amount require no manual founder approval.
                  </p>
                </div>
              </GlassPanel>
            </div>

            {/* Action Policy Registry */}
            <GlassPanel level={2} className="rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-sm">Action Policy Registry</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Configure safety policy decisions per action category across all agents
                  </p>
                </div>
              </div>

              <div className="divide-y divide-white/[0.06]">
                {Object.values(policies).map((pol) => (
                  <div key={pol.actionCategory} className="flex items-center justify-between py-3 text-[12px]">
                    <div className="space-y-0.5 max-w-lg">
                      <div className="font-mono font-medium text-foreground">{pol.actionCategory}</div>
                      <div className="text-[10px] text-muted-foreground">{pol.description}</div>
                    </div>

                    <select
                      value={pol.decision}
                      onChange={(e) => handlePolicyChange(pol.actionCategory, e.target.value as any)}
                      className={`h-7 rounded-md px-2.5 text-[11px] font-medium outline-none border cursor-pointer ${
                        pol.decision === 'ALLOW'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : pol.decision === 'REQUIRE_APPROVAL'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-red-500/10 text-red-400 border-red-500/30'
                      }`}
                    >
                      <option value="ALLOW" className="bg-black text-emerald-400">ALLOW</option>
                      <option value="REQUIRE_APPROVAL" className="bg-black text-amber-400">REQUIRE_APPROVAL</option>
                      <option value="DENY" className="bg-black text-red-400">DENY</option>
                    </select>
                  </div>
                ))}
              </div>
            </GlassPanel>
          </>
        )}
      </div>
    </div>
  )
}
