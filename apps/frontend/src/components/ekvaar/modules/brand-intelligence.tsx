'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, useRef } from 'react'
import { ShieldCheck, Palette, Globe, Box } from 'lucide-react'
import { PageHeader } from '../shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { OSManifest } from '@/lib/os-desktop/manifest'
import { KnowledgeAssetView } from './knowledge-asset-view'
import { toast } from '@/components/ekvaar/desktop/toast'

export const manifest: OSManifest = {
  id: 'brand-intelligence',
  name: 'Brand Intelligence',
  version: '1.0.0',
  icon: 'guardian',
  category: 'core',
  requiredCapabilities: [],
  entryPoint: BrandIntelligence,
  permissions: ['system:window']
}

const FIELDS: { key: string; label: string; icon: any; placeholder: string }[] = [
  { key: 'companyProfile', label: 'Company Profile', icon: Globe, placeholder: 'e.g. A modern D2C fashion brand' },
  { key: 'industry', label: 'Industry', icon: Globe, placeholder: 'e.g. Fashion & Apparel' },
  { key: 'brandDna', label: 'Brand DNA', icon: Palette, placeholder: 'e.g. Minimalist, sustainable, bold' },
  { key: 'toneOfVoice', label: 'Tone of Voice', icon: Palette, placeholder: 'e.g. Direct, sophisticated, confident' },
  { key: 'products', label: 'Products', icon: Box, placeholder: 'e.g. High-end streetwear and accessories' },
  { key: 'goals', label: 'Strategic Goals', icon: ShieldCheck, placeholder: 'e.g. Grow D2C revenue 3x this year' },
]

export function BrandIntelligence() {
  const queryClient = useQueryClient()
  const [values, setValues] = useState<Record<string, string>>({})
  const hasSyncedRef = useRef(false)
  const timeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const { data: orgContext, isLoading } = useQuery({
    queryKey: ['org-context'],
    queryFn: async () => {
      const res = await fetch('/api/organization/context')
      if (!res.ok) throw new Error('Failed to fetch context')
      return res.json()
    }
  })

  useEffect(() => {
    if (orgContext && !hasSyncedRef.current) {
      hasSyncedRef.current = true
      setValues(orgContext) // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [orgContext])

  const mutation = useMutation({
    mutationFn: async (updates: Record<string, string>) => {
      const r = await fetch('/api/organization/context', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!r.ok) throw new Error('Failed to save')
      return r.json()
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['org-context'], data)
      toast.success('Saved')
    },
    onError: () => toast.error('Save failed', 'Could not reach the server'),
  })

  const handleChange = (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }))
    if (timeouts.current[key]) clearTimeout(timeouts.current[key])
    timeouts.current[key] = setTimeout(() => mutation.mutate({ [key]: value }), 600)
  }

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading Brand Intelligence...</div>
  }

  return (
    <div>
      <PageHeader
        eyebrow="Brand Intelligence"
        title="Organization Identity"
        description="Define your organization's brand knowledge — Krishna and every agent uses this as ground truth."
      />

      <div className="px-4 lg:px-8 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FIELDS.map(f => (
            <Card key={f.key}>
              <CardHeader className="pb-2">
                <CardTitle className="font-display tracking-tight flex items-center gap-2 text-sm">
                  <f.icon className="h-4 w-4" /> {f.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  value={values[f.key] || ''}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="text-sm"
                />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border/50 bg-muted/10">
           <CardHeader>
             <CardTitle className="font-display flex items-center gap-2">
               <Box className="h-5 w-5" />
               Knowledge Assets
             </CardTitle>
             <CardDescription>Structured collections of organizational knowledge.</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="border border-border/50 rounded-md overflow-hidden bg-background max-h-[400px] overflow-y-auto">
                <KnowledgeAssetView />
             </div>
           </CardContent>
        </Card>
      </div>
    </div>
  )
}
