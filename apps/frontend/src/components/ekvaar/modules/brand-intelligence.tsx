'use client'

import { useQuery } from '@tanstack/react-query'
import { ShieldCheck, Palette, FileText, Globe, Box } from 'lucide-react'
import { PageHeader } from '../shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { OSManifest } from '@/lib/os-desktop/manifest'
import { KnowledgeAssetView } from './knowledge-asset-view'

export const manifest: OSManifest = {
  id: 'brand-intelligence',
  name: 'Brand Intelligence',
  version: '1.0.0',
  icon: 'guardian', 
  category: 'core',
  requiredCapabilities: ['brand_intelligence'],
  entryPoint: BrandIntelligence,
  permissions: ['system:window']
}

export function BrandIntelligence() {
  const { data: orgContext, isLoading } = useQuery({
    queryKey: ['org-context'],
    queryFn: async () => {
      const res = await fetch('/api/organization/context')
      if (!res.ok) throw new Error('Failed to fetch context')
      return res.json()
    }
  })

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading Brand Intelligence...</div>
  }

  const context = orgContext || {}
  const { 
    companyProfile = "Not defined", 
    brandDna = "Not defined", 
    industry = "Not defined", 
    toneOfVoice = "Not defined" 
  } = context

  return (
    <div>
      <PageHeader
        eyebrow="Brand Intelligence"
        title="Organization Identity"
        description="Dynamic interface over your organization's canonical brand knowledge."
      />

      <div className="px-4 lg:px-8 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display tracking-tight flex items-center gap-2">
                <Globe className="h-4 w-4" /> Company Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{companyProfile}</p>
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs font-mono text-muted-foreground uppercase">Industry</p>
                <p className="text-sm font-medium">{industry}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display tracking-tight flex items-center gap-2">
                <Palette className="h-4 w-4" /> Brand DNA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{brandDna}</p>
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs font-mono text-muted-foreground uppercase">Tone of Voice</p>
                <p className="text-sm font-medium">{toneOfVoice}</p>
              </div>
            </CardContent>
          </Card>
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
             <div className="text-sm text-muted-foreground mb-4">
               Rendered Assets: House of Originals
             </div>
             <div className="border border-border/50 rounded-md overflow-hidden bg-background max-h-[400px] overflow-y-auto">
                <KnowledgeAssetView />
             </div>
           </CardContent>
        </Card>
      </div>
    </div>
  )
}
