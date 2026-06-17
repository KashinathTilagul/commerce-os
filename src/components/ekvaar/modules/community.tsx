'use client'

import { useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { Users, Heart, BookOpen, Sparkles, Crown, Archive, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageHeader, KpiCard, StatusPill } from '../shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatINR, formatINRFull, timeAgo } from '@/lib/ekvaar'

const TIER_META: Record<string, { label: string; color: string; icon: any }> = {
  ORIGINAL: { label: 'Original', color: 'text-foreground', icon: Users },
  HOUSE: { label: 'House', color: 'text-neel', icon: Heart },
  ARCHIVE: { label: 'Archive', color: 'text-arav', icon: Archive },
  FOUNDER_CIRCLE: { label: 'Founder Circle', color: 'text-gulabi', icon: Crown },
}

export function CommunityModule() {
  const [tab, setTab] = useState('members')
  const [search, setSearch] = useState('')

  const { data: customers = [] } = useQuery<any[]>(({
    queryKey: ['customers'],
    queryFn: async () => {
      const r = await fetch('/api/customers')
      return r.json()
    },
  }))

  const { data: restorations = [] } = useQuery<any[]>({
    queryKey: ['restorations'],
    queryFn: async () => {
      const r = await fetch('/api/restorations')
      return r.json()
    },
  })

  const { data: notes = [] } = useQuery<any[]>({
    queryKey: ['founder-notes'],
    queryFn: async () => {
      const r = await fetch('/api/founder-notes')
      return r.json()
    },
  })

  const filteredCustomers = useMemo(() => {
    if (!search) return customers
    const q = search.toLowerCase()
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.city.toLowerCase().includes(q))
  }, [customers, search])

  const tierCounts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const c of customers) m[c.tier] = (m[c.tier] || 0) + 1
    return m
  }, [customers])

  const totalCommunitySpend = customers.reduce((s, c) => s + c.totalSpent, 0)
  const totalRestorations = restorations.length
  const completedRestorations = restorations.filter((r) => r.status === 'COMPLETED').length

  return (
    <div>
      <PageHeader
        eyebrow="Originals · Community"
        title="Customers Are Originals, Not Followers"
        description="Belonging over audience farming. Community systems: Founder Notes, Restoration Programs, House Access, Archive Access, Story-led campaigns. Every member is held by the House."
        actions={
          <Button size="sm" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Publish Founder Note
          </Button>
        }
      />

      <div className="px-4 lg:px-8 py-8 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Originals" value={String(customers.length)} accent="#1F3A5F" icon={<Users className="h-4 w-4" />} />
          <KpiCard label="Lifetime Community Spend" value={formatINR(totalCommunitySpend)} accent="#2F4F3A" />
          <KpiCard label="Restorations" value={String(totalRestorations)} accent="#C8302A" icon={<Heart className="h-4 w-4" />} />
          <KpiCard label="Founder Notes" value={String(notes.filter((n) => n.status === 'PUBLISHED').length)} accent="#D4859B" icon={<BookOpen className="h-4 w-4" />} />
        </div>

        {/* Tier distribution */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(TIER_META).map(([key, meta]) => {
            const Icon = meta.icon
            const count = tierCounts[key] || 0
            return (
              <Card key={key}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <Icon className={`h-4 w-4 ${meta.color}`} />
                    <span className="text-[10px] tracking-wider uppercase text-muted-foreground">{meta.label}</span>
                  </div>
                  <div className="font-display text-2xl mt-2">{count}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {customers.length > 0 ? ((count / customers.length) * 100).toFixed(0) : 0}% of community
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="restorations">Restorations</TabsTrigger>
            <TabsTrigger value="notes">Founder Notes</TabsTrigger>
          </TabsList>

          {/* Members */}
          <TabsContent value="members" className="mt-6">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-display tracking-tight text-base">Originals Directory</CardTitle>
                  <CardDescription className="text-xs">{filteredCustomers.length} members</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search members…"
                    className="pl-9 h-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card">
                      <TableRow>
                        <TableHead className="text-[10px] tracking-wider uppercase">Member</TableHead>
                        <TableHead className="text-[10px] tracking-wider uppercase">City</TableHead>
                        <TableHead className="text-[10px] tracking-wider uppercase">Tier</TableHead>
                        <TableHead className="text-[10px] tracking-wider uppercase text-right">Orders</TableHead>
                        <TableHead className="text-[10px] tracking-wider uppercase text-right">Spent</TableHead>
                        <TableHead className="text-[10px] tracking-wider uppercase text-right">Restorations</TableHead>
                        <TableHead className="text-[10px] tracking-wider uppercase">Last Active</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.slice(0, 100).map((c) => {
                        const meta = TIER_META[c.tier] || TIER_META.ORIGINAL
                        return (
                          <TableRow key={c.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
                                  {c.name.split(' ').map((n: string) => n[0]).join('')}
                                </div>
                                <div>
                                  <div className="text-sm font-medium">{c.name}</div>
                                  <div className="text-[10px] text-muted-foreground">{c.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">{c.city}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center gap-1 text-[10px] tracking-wider uppercase ${meta.color}`}>
                                <meta.icon className="h-3 w-3" /> {meta.label}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">{c.totalOrders}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatINR(c.totalSpent)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{c.restorationCount}</TableCell>
                            <TableCell className="text-[10px] text-muted-foreground">{timeAgo(c.lastActive)}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Restorations */}
          <TabsContent value="restorations" className="mt-6 space-y-4">
            <Card className="bg-arav/5 border-arav/30">
              <CardContent className="p-5">
                <div className="text-[10px] tracking-[0.25em] uppercase text-arav mb-2">Restoration Program</div>
                <p className="text-sm text-foreground/80 max-w-2xl leading-relaxed">
                  EKVAAR pieces are built to age well, repeat well, and stay relevant across years. The Restoration Program repairs wear, reshapes silhouettes, and recolors faded pieces — extending each garment's life indefinitely. This is structural permanence, not sustainability marketing.
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(['REQUESTED', 'IN_REPAIR', 'COMPLETED', 'DECLINED'] as const).map((s) => {
                const count = restorations.filter((r) => r.status === s).length
                return (
                  <Card key={s}>
                    <CardContent className="p-4">
                      <StatusPill status={s} />
                      <div className="font-display text-2xl mt-2">{count}</div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-display tracking-tight text-base">All Restoration Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card">
                      <TableRow>
                        <TableHead className="text-[10px] tracking-wider uppercase">Customer</TableHead>
                        <TableHead className="text-[10px] tracking-wider uppercase">Product</TableHead>
                        <TableHead className="text-[10px] tracking-wider uppercase">Reason</TableHead>
                        <TableHead className="text-[10px] tracking-wider uppercase">Status</TableHead>
                        <TableHead className="text-[10px] tracking-wider uppercase">Requested</TableHead>
                        <TableHead className="text-[10px] tracking-wider uppercase">Completed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {restorations.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-sm font-medium">{r.customerName}</TableCell>
                          <TableCell>
                            <div className="text-sm">{r.productName}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{r.productSku}</div>
                          </TableCell>
                          <TableCell className="text-xs">{r.reason}</TableCell>
                          <TableCell><StatusPill status={r.status} /></TableCell>
                          <TableCell className="text-[10px] text-muted-foreground">{timeAgo(r.requestedAt)}</TableCell>
                          <TableCell className="text-[10px] text-muted-foreground">{r.completedAt ? timeAgo(r.completedAt) : '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Founder Notes */}
          <TabsContent value="notes" className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notes.map((n) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="h-full flex flex-col">
                    <CardContent className="p-6 flex-1 flex flex-col">
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="outline" className="text-[10px] tracking-wider uppercase">
                          {n.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {n.publishedAt ? timeAgo(n.publishedAt) : 'Draft'}
                        </span>
                      </div>
                      <h3 className="font-display text-xl tracking-tight leading-tight">{n.title}</h3>
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed flex-1">{n.excerpt}</p>
                      <div className="mt-4 pt-4 border-t border-border text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                        EKVAAR · Founder Note
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
