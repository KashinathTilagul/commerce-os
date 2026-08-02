'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Boxes, CheckCircle2, ExternalLink, Factory, Loader2, PackagePlus, RefreshCw, Send, ShoppingBag } from 'lucide-react'
import { PageHeader, KpiCard, StatusPill } from '../shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function pickOrders(data: any) {
  return data?.summary?.latest || []
}

function qikinkOrderId(order: any) {
  return order.id || order.order_id || order.order_number || order.orderNumber || '—'
}

function qikinkOrderStatus(order: any) {
  return String(order.status || order.order_status || order.fulfillment_status || 'UNKNOWN').toUpperCase()
}

export function QikinkApp() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['qikink-monitor'],
    queryFn: async () => {
      const response = await fetch('/api/manufacturers/qikink')
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Qikink monitor failed')
      return payload
    },
    refetchInterval: 60000,
  })

  const summary = data?.summary
  const orders = pickOrders(data)
  const statuses = summary?.byStatus || {}
  const blocked = !isLoading && isError

  return (
    <div>
      <PageHeader
        eyebrow="Manufacturer · EKVAAR only"
        title="Qikink Operations"
        description="Monitor Qikink print-on-demand fulfillment from the OS. Sandbox is active now; live mode will switch on once Qikink approves live API access."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5">
              {blocked ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
              {blocked ? 'Needs attention' : `${data?.mode || 'sandbox'} monitor`}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Refresh
            </Button>
          </div>
        }
      />

      <div className="px-4 lg:px-8 py-8 space-y-6">
        {blocked && (
          <Card className="border-destructive/40">
            <CardContent className="py-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <div className="font-medium">Qikink could not be reached</div>
                <div className="text-sm text-muted-foreground">{(error as Error)?.message}</div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Orders in Qikink" value={isLoading ? '—' : String(summary?.total ?? 0)} accent="#1F3A5F" icon={<ShoppingBag className="h-4 w-4" />} />
          <KpiCard label="Monitor Mode" value={data?.mode || 'sandbox'} accent="#2F4F3A" icon={<Factory className="h-4 w-4" />} />
          <KpiCard label="Open Statuses" value={String(Object.keys(statuses).length)} accent="#D4859B" icon={<Boxes className="h-4 w-4" />} />
          <KpiCard label="Refresh Cadence" value="60s" accent="#C8302A" icon={<RefreshCw className="h-4 w-4" />} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Fulfillment Orders</CardTitle>
              <CardDescription>Latest Qikink orders returned by the manufacturer API.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-12 flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading Qikink orders...
                </div>
              ) : orders.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <ShoppingBag className="h-7 w-7 mx-auto mb-3" />
                  No Qikink sandbox orders yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order: any, index: number) => (
                      <TableRow key={`${qikinkOrderId(order)}-${index}`}>
                        <TableCell className="font-medium">{qikinkOrderId(order)}</TableCell>
                        <TableCell><StatusPill status={qikinkOrderStatus(order)} /></TableCell>
                        <TableCell>{order.customer_name || order.name || order.shipping_name || '—'}</TableCell>
                        <TableCell className="text-right">{order.total_order_value || order.total || order.amount || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agent Actions</CardTitle>
              <CardDescription>Prepared OS workflows for Qikink + Shopify operations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Action label="Create Qikink order" detail="Convert approved Shopify order into a Qikink fulfillment order." icon={<PackagePlus className="h-4 w-4" />} />
              <Action label="Push product to Shopify" detail="Create Shopify product, then map SKU/design metadata for Qikink." icon={<Send className="h-4 w-4" />} />
              <Action label="Sync fulfillment status" detail="Pull Qikink status and update OS order state." icon={<RefreshCw className="h-4 w-4" />} />
              <Button variant="outline" className="w-full justify-start" onClick={() => window.open('https://dashboard.qikink.com', '_blank')}>
                <ExternalLink className="h-4 w-4" /> Open Qikink dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Action({ label, detail, icon }: { label: string; detail: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center gap-2 font-medium text-sm">{icon}{label}</div>
      <div className="text-xs text-muted-foreground mt-1">{detail}</div>
    </div>
  )
}
