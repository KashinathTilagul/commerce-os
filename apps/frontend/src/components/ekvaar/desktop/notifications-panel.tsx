'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Bell, BellOff, CheckCheck, TrendingUp, ShoppingBag, AlertCircle, Info, Zap, ShieldAlert } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

export interface Notification {
  id: string
  type: 'order' | 'metric' | 'alert' | 'system' | 'ai' | 'security'
  title: string
  body: string
  ts: number
  read: boolean
}

function relativeTime(ts: number) {
  const diff = Date.now() - ts
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

const typeIcon: Record<Notification['type'], React.ReactNode> = {
  order:    <ShoppingBag className="h-3.5 w-3.5" />,
  metric:   <TrendingUp className="h-3.5 w-3.5" />,
  alert:    <AlertCircle className="h-3.5 w-3.5" />,
  system:   <Info className="h-3.5 w-3.5" />,
  ai:       <Zap className="h-3.5 w-3.5" />,
  security: <ShieldAlert className="h-3.5 w-3.5" />,
}

const typeColor: Record<Notification['type'], string> = {
  order:    '#34C759',
  metric:   '#0A84FF',
  alert:    '#FF9F0A',
  system:   '#8E8E93',
  ai:       '#BF5AF2',
  security: '#FF3B30',
}

interface Props { open: boolean; onClose: () => void }

export function NotificationsPanel({ open, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [items, setItems] = useState<Notification[]>([])
  const [dnd, setDnd] = useState(false)
  const [stats, setStats] = useState({ orders: 0, revenue: '₹0', pending: 0 })

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(data => {
        const notifications: Notification[] = (data.recentEvents || []).slice(0, 8).map((event: any) => ({
          id: event.id,
          type: event.severity === 'CRITICAL' || event.severity === 'ERROR' ? 'security' : event.type?.includes('ORDER') ? 'order' : event.type?.includes('AGENT') ? 'ai' : 'system',
          title: event.type?.replaceAll('_', ' ') || 'System event',
          body: event.summary || `${event.actorName || 'System'} recorded an event`,
          ts: new Date(event.timestamp).getTime(),
          read: true,
        }))

        if (data.lowStock?.length) {
          data.lowStock.slice(0, 2).forEach((p: any, i: number) => {
            notifications.push({
              id: `alert-stock-${i}`,
              type: 'alert',
              title: 'Low Inventory',
              body: `${p.name || p.product_name} — ${p.stock || p.quantity} units left`,
              ts: Date.now(),
              read: false
            })
          })
        }

        if (data.kpis?.pendingApprovals > 0) notifications.unshift({
          id: 'pending-approvals', type: 'alert', title: 'Founder decision required',
          body: `${data.kpis.pendingApprovals} approval${data.kpis.pendingApprovals === 1 ? '' : 's'} waiting in Founder Inbox`,
          ts: Date.now(), read: false,
        })
        
        setItems(notifications)
        setStats({
          orders: data.kpis?.ordersLast30 || 0,
          revenue: data.kpis?.revenueLast30 ? `₹${(data.kpis.revenueLast30 / 100000).toFixed(1)}L` : '₹0',
          pending: data.kpis?.pendingApprovals || 0
        })
      })
      .catch(() => {
        setItems([{ id: 'notification-error', type: 'alert', title: 'Notifications unavailable', body: 'The notification feed could not be loaded. Try again.', ts: Date.now(), read: false }])
      })
  }, [open])

  const unread = items.filter(n => !n.read).length
  const markAll = () => setItems(prev => prev.map(n => ({ ...n, read: true })))
  const dismiss = (id: string) => setItems(prev => prev.filter(n => n.id !== id))
  const markRead = (id: string) => setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[8900]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="fixed z-[9000] right-2 rounded-2xl overflow-hidden shadow-2xl border border-border"
            style={{
              top: '32px',
              width: 360,
              background: 'var(--card)',
              backdropFilter: 'blur(40px) saturate(180%)',
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-border">
              <Bell className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">Notifications</span>
              {unread > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-destructive text-white leading-none">
                  {unread}
                </span>
              )}
              <div className="ml-auto flex items-center gap-1">
                {unread > 0 && (
                  <button onClick={markAll} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1 rounded hover:bg-muted">
                    <CheckCheck className="h-3 w-3" /> Mark all read
                  </button>
                )}
                <button
                  onClick={() => setDnd(d => !d)}
                  title={dnd ? 'DND on' : 'DND off'}
                  className={`p-1 rounded transition-colors ${dnd ? 'text-orange-500' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <BellOff className="h-3.5 w-3.5" />
                </button>
                <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Today's summary */}
            <div className="px-4 py-2.5 border-b border-border flex gap-4 bg-muted/40">
              {[
                { label: 'Orders', value: stats.orders, color: '#34C759' },
                { label: 'Revenue', value: stats.revenue, color: '#0A84FF' },
                { label: 'Pending', value: stats.pending, color: '#FF9F0A' },
              ].map(s => (
                <div key={s.label} className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground">{s.label}</span>
                  <span className="text-xs font-semibold" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* Notification list */}
            <div className="max-h-80 overflow-y-auto py-1">
              {items.length === 0 && (
                <div className="py-10 text-center text-[11px] text-muted-foreground">All caught up!</div>
              )}
              {items.map(n => (
                <motion.div
                  key={n.id}
                  layout
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  onClick={() => markRead(n.id)}
                  className={`group flex items-start gap-3 px-4 py-3 hover:bg-muted/60 transition-colors cursor-pointer border-b border-border/50 last:border-0 ${n.read ? 'opacity-70' : ''}`}
                >
                  <div
                    className="mt-0.5 h-6 w-6 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${typeColor[n.type]}20`, color: typeColor[n.type] }}
                  >
                    {typeIcon[n.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[12px] font-medium leading-tight text-foreground">
                        {n.title}
                      </span>
                      {!n.read && (
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">{n.body}</p>
                    <span className="text-[10px] text-muted-foreground/60 mt-1 block">{relativeTime(n.ts)}</span>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); dismiss(n.id) }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-foreground transition-all shrink-0 mt-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </motion.div>
              ))}
            </div>

            {dnd && (
              <div className="px-4 py-2 border-t border-border flex items-center gap-2 bg-orange-500/10">
                <BellOff className="h-3 w-3 text-orange-500" />
                <span className="text-[10px] text-orange-600 dark:text-orange-400">Do Not Disturb is on</span>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
