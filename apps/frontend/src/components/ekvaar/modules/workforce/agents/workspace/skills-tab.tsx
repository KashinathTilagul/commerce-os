'use client'

import { useState } from 'react'
import { GlassPanel } from '@/components/ui/glass-system'
import { Wrench, Check, Plus, Loader2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ekvaar/desktop/toast'

const AVAILABLE_SKILLS = [
  { code: 'brand-strategy', name: 'Brand Strategy & Positioning', category: 'marketing' },
  { code: 'meta-ads', name: 'Meta Ads Campaign Execution', category: 'marketing' },
  { code: 'shopify-analytics', name: 'Shopify Analytics & Inventory', category: 'ecommerce' },
  { code: 'financial-modeling', name: 'Financial Modeling & Budgeting', category: 'finance' },
  { code: 'code-generation', name: 'Full-Stack Code Generation', category: 'engineering' },
  { code: 'market-research', name: 'Market & Competitor Intelligence', category: 'research' },
  { code: 'seo-audit', name: 'SEO & Content Optimization', category: 'growth' },
]

export function SkillsTab({ agent }: { agent: any }) {
  const queryClient = useQueryClient()
  const activeSkillsList = (agent.skills || '').split(',').map((s: string) => s.trim()).filter(Boolean)
  const [skills, setSkills] = useState<string[]>(activeSkillsList)

  const updateMutation = useMutation({
    mutationFn: async (newSkills: string[]) => {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills: newSkills.join(',') }),
      })
      if (!res.ok) throw new Error('Failed to update skills')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Agent skills updated')
      queryClient.invalidateQueries({ queryKey: ['workforce-agent', agent.id] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Update failed')
    },
  })

  const toggleSkill = (code: string) => {
    const updated = skills.includes(code)
      ? skills.filter((s) => s !== code)
      : [...skills, code]
    setSkills(updated)
    updateMutation.mutate(updated)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="font-display text-base tracking-tight">Composable Agent Skills</h2>
        <p className="text-[11px] text-muted-foreground">
          Enable or disable capabilities assigned to this digital employee
        </p>
      </div>

      <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
        {AVAILABLE_SKILLS.map((sk) => {
          const isEnabled = skills.includes(sk.code)
          return (
            <GlassPanel
              key={sk.code}
              level={2}
              className={`cursor-pointer rounded-xl p-4 transition-all flex items-center justify-between border ${
                isEnabled ? 'border-emerald-500/30 bg-emerald-500/[0.04]' : 'border-white/[0.06] opacity-70 hover:opacity-100'
              }`}
              onClick={() => toggleSkill(sk.code)}
            >
              <div className="flex items-center gap-3">
                <Wrench className={`h-4 w-4 ${isEnabled ? 'text-emerald-400' : 'text-muted-foreground'}`} />
                <div>
                  <div className="text-[12px] font-medium leading-tight">{sk.name}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{sk.category}</div>
                </div>
              </div>

              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] transition-colors ${
                  isEnabled ? 'border-emerald-400 bg-emerald-500/20 text-emerald-400' : 'border-white/[0.2] text-transparent'
                }`}
              >
                <Check className="h-3 w-3" />
              </div>
            </GlassPanel>
          )
        })}
      </div>
    </div>
  )
}
