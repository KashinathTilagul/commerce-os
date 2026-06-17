'use client'

import { useQuery } from '@tanstack/react-query'
import { ShieldCheck, Palette, FileText, Package, Globe, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageHeader, KpiCard, StatusPill, ColorDot } from '../shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { EKVAAR_COLORS, EKVAAR_PRINCIPLES, timeAgo } from '@/lib/ekvaar'

export function BrandGuardian() {
  const { data: checks = [] } = useQuery<any[]>({
    queryKey: ['brand-checks'],
    queryFn: async () => {
      const r = await fetch('/api/brand-checks')
      return r.json()
    },
  })

  const pass = checks.filter((c) => c.status === 'PASS').length
  const warn = checks.filter((c) => c.status === 'WARN').length
  const fail = checks.filter((c) => c.status === 'FAIL').length
  const compliance = checks.length > 0 ? Math.round((pass / checks.length) * 100) : 100

  // by module
  const moduleStats: Record<string, { pass: number; warn: number; fail: number }> = {}
  for (const c of checks) {
    if (!moduleStats[c.module]) moduleStats[c.module] = { pass: 0, warn: 0, fail: 0 }
    moduleStats[c.module][c.status.toLowerCase() as 'pass' | 'warn' | 'fail']++
  }

  return (
    <div>
      <PageHeader
        eyebrow="Brand Guardian"
        title="Brand Book Compliance"
        description="The EKVAAR palette is permanent. All products integrate into the six-color system. Cross-collection compatibility is mandatory. This module enforces the brand book — flagging palette violations, voice drift, and forbidden aesthetics."
        actions={
          <div className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-md">
            <ShieldCheck className="h-3.5 w-3.5 text-arav" />
            <span className="text-xs">Last scan: {checks.length > 0 ? timeAgo(checks[0].checkedAt) : '—'}</span>
          </div>
        }
      />

      <div className="px-4 lg:px-8 py-8 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Compliance Score" value={`${compliance}%`} accent="#2F4F3A" icon={<ShieldCheck className="h-4 w-4" />} />
          <KpiCard label="Pass" value={String(pass)} accent="#2F4F3A" icon={<CheckCircle2 className="h-4 w-4" />} />
          <KpiCard label="Warnings" value={String(warn)} accent="#D4859B" icon={<AlertTriangle className="h-4 w-4" />} />
          <KpiCard label="Violations" value={String(fail)} accent="#C8302A" icon={<XCircle className="h-4 w-4" />} />
        </div>

        {/* The Six Colors palette enforcement */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display tracking-tight flex items-center gap-2">
              <Palette className="h-4 w-4" /> The Six Colors · Permanent Palette
            </CardTitle>
            <CardDescription className="text-xs">
              No uncontrolled palettes. Cross-collection compatibility is mandatory.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {EKVAAR_COLORS.map((c) => (
                <div key={c.name} className="arch-card p-4">
                  <div
                    className="aspect-square rounded-md mb-3 relative overflow-hidden grain"
                    style={{ background: c.hex }}
                  >
                    <div className="absolute bottom-1.5 right-1.5 text-[9px] font-mono opacity-60" style={{ color: c.name === 'Rui White' ? '#0A0A0A' : '#F5F1EA' }}>
                      {c.hex}
                    </div>
                  </div>
                  <div className="text-sm font-display tracking-tight">{c.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{c.meaning}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Module compliance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display tracking-tight text-base">Compliance by Module</CardTitle>
            <CardDescription className="text-xs">Where the brand is held — and where it slips</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(moduleStats).map(([mod, s]) => {
                const total = s.pass + s.warn + s.fail
                const pct = total > 0 ? Math.round((s.pass / total) * 100) : 100
                const icons: Record<string, any> = {
                  PRODUCT: Package,
                  CONTENT: FileText,
                  CAMPAIGN: MegaphoneIcon,
                  PACKAGING: Package,
                  DIGITAL: Globe,
                }
                const Icon = icons[mod] || FileText
                return (
                  <Card key={mod}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[10px] tracking-wider uppercase text-muted-foreground">{mod}</span>
                      </div>
                      <div className="font-display text-2xl">{pct}%</div>
                      <Progress value={pct} className="h-1 mt-2" />
                      <div className="text-[10px] text-muted-foreground mt-2">
                        {s.pass} pass · {s.warn} warn · {s.fail} fail
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent checks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display tracking-tight text-base">Recent Brand Checks</CardTitle>
            <CardDescription className="text-xs">Live enforcement log</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead className="text-[10px] tracking-wider uppercase">Asset</TableHead>
                    <TableHead className="text-[10px] tracking-wider uppercase">Module</TableHead>
                    <TableHead className="text-[10px] tracking-wider uppercase">Status</TableHead>
                    <TableHead className="text-[10px] tracking-wider uppercase text-right">Violations</TableHead>
                    <TableHead className="text-[10px] tracking-wider uppercase">Notes</TableHead>
                    <TableHead className="text-[10px] tracking-wider uppercase">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checks.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm font-medium">{c.asset}</TableCell>
                      <TableCell className="text-xs">{c.module}</TableCell>
                      <TableCell><StatusPill status={c.status} /></TableCell>
                      <TableCell className={`text-right font-mono ${c.violations > 0 ? 'text-agni' : 'text-arav'}`}>{c.violations}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.notes}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">{timeAgo(c.checkedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Operating principles */}
        <Card className="bg-arav/5 border-arav/30">
          <CardHeader className="pb-2">
            <CardTitle className="font-display tracking-tight">Operating Principles</CardTitle>
            <CardDescription className="text-xs">Every major decision must strengthen the House</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {EKVAAR_PRINCIPLES.map((p, i) => (
                <div key={p} className="flex items-start gap-3">
                  <span className="text-[10px] font-mono text-muted-foreground mt-1">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-sm">{p}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MegaphoneIcon(props: any) {
  return <ShieldCheck {...props} />
}
