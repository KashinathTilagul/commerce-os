'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function DesktopWidgets() {
  const [data, setData] = useState<any>(null)
  
  useEffect(() => {
    const fetchWidgets = async () => {
      try {
        const res = await fetch('/api/dashboard')
        if (res.ok) {
          const json = await res.json()
          setData(json.data)
        }
      } catch (e) {
        console.error('Widget fetch error', e)
      }
    }
    fetchWidgets()
    const int = setInterval(fetchWidgets, 60000)
    return () => clearInterval(int)
  }, [])

  if (!data) return null

  const { kpis } = data
  if (!kpis) return null

  return (
    <div className="absolute top-12 right-6 bottom-32 w-80 flex flex-col gap-4 pointer-events-none z-[1]">
      <AnimatePresence>
        <WidgetCard
          title="RUNWAY & CASH"
          value={`₹${(kpis.cashPosition / 100000).toFixed(1)}L`}
          sub={kpis.runwayMonths > 0 ? `${kpis.runwayMonths} months runway` : 'Critical'}
          delay={0.1}
          alert={kpis.runwayMonths < 3}
        />
        <WidgetCard
          title="AGENTS ONLINE"
          value={`${kpis.activeAgents} / ${kpis.totalAgents}`}
          sub={`${kpis.aiHealth}% Average Health`}
          delay={0.2}
        />
        <WidgetCard
          title="PENDING APPROVALS"
          value={kpis.pendingApprovals.toString()}
          sub={kpis.unreadApprovals > 0 ? `${kpis.unreadApprovals} unread` : 'All read'}
          delay={0.3}
          alert={kpis.pendingApprovals > 0}
        />
        <WidgetCard
          title="ACTIVE ISSUES"
          value={kpis.openIssues.toString()}
          sub={kpis.blockedIssues > 0 ? `${kpis.blockedIssues} blocked` : 'All flowing'}
          delay={0.4}
          alert={kpis.blockedIssues > 0}
        />
      </AnimatePresence>
    </div>
  )
}

function WidgetCard({ title, value, sub, delay, alert }: { title: string, value: string, sub: string, delay: number, alert?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, type: 'spring', stiffness: 200, damping: 20 }}
      className="p-4 rounded-2xl flex flex-col gap-1"
      style={{
        background: 'rgba(20, 20, 24, 0.4)',
        backdropFilter: 'blur(40px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      }}
    >
      <div className="text-[10px] font-medium tracking-wider text-white/50 uppercase">{title}</div>
      <div className={`text-2xl font-display tracking-tight ${alert ? 'text-[#FF5F57]' : 'text-white'}`}>
        {value}
      </div>
      <div className="text-xs text-white/40">{sub}</div>
    </motion.div>
  )
}
