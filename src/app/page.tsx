'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Search, Bell, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { MODULES, type ModuleId } from '@/lib/ekvaar'
import * as Icons from 'lucide-react'
import { CommandCenter } from '@/components/ekvaar/modules/command-center'
import { HouseOfOriginals } from '@/components/ekvaar/modules/house-of-originals'
import { SalesOrders } from '@/components/ekvaar/modules/sales-orders'
import { FinanceModule } from '@/components/ekvaar/modules/finance'
import { InventoryOps } from '@/components/ekvaar/modules/inventory-ops'
import { CommunityModule } from '@/components/ekvaar/modules/community'
import { CampaignsModule } from '@/components/ekvaar/modules/campaigns'
import { BrandGuardian } from '@/components/ekvaar/modules/brand-guardian'
import { AIInfrastructure } from '@/components/ekvaar/modules/ai-infrastructure'

export default function Home() {
  const [activeModule, setActiveModule] = useState<ModuleId>('command')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(true)

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  // Group modules
  const groups: Record<string, typeof MODULES> = {}
  MODULES.forEach((m) => {
    if (!groups[m.group]) groups[m.group] = [] as any
    groups[m.group].push(m)
  })

  const renderModule = () => {
    switch (activeModule) {
      case 'command': return <CommandCenter onNavigate={setActiveModule} />
      case 'house': return <HouseOfOriginals />
      case 'sales': return <SalesOrders />
      case 'finance': return <FinanceModule />
      case 'inventory': return <InventoryOps />
      case 'community': return <CommunityModule />
      case 'campaigns': return <CampaignsModule />
      case 'guardian': return <BrandGuardian />
      case 'ai': return <AIInfrastructure />
      default: return <CommandCenter onNavigate={setActiveModule} />
    }
  }

  const activeModuleData = MODULES.find((m) => m.id === activeModule)

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border z-40 transition-transform duration-300 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand */}
        <div className="px-6 py-6 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display text-2xl tracking-tight leading-none">EKVAAR</div>
              <div className="text-[10px] tracking-[0.25em] text-sidebar-foreground/60 mt-1.5 uppercase">
                India ka Original
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 flex items-center gap-1.5">
            <div className="h-1 w-6 bg-agni" />
            <div className="h-1 w-6 bg-neel" />
            <div className="h-1 w-6 bg-arav" />
            <div className="h-1 w-6 bg-gulabi" />
            <div className="h-1 w-6 bg-sidebar-foreground/30" />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {Object.entries(groups).map(([group, modules]) => (
            <div key={group}>
              <div className="px-3 mb-2 text-[10px] tracking-[0.2em] text-sidebar-foreground/40 uppercase">
                {group}
              </div>
              <div className="space-y-1">
                {modules.map((m) => {
                  const Icon = (Icons as any)[m.icon] || Icons.Circle
                  const active = activeModule === m.id
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        setActiveModule(m.id as ModuleId)
                        setSidebarOpen(false)
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-200 ${
                        active
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{m.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer status */}
        <div className="px-4 py-4 border-t border-sidebar-border">
          <div className="text-[10px] tracking-[0.2em] text-sidebar-foreground/40 uppercase mb-2">
            Brand Health
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 bg-sidebar-accent rounded-full overflow-hidden">
              <div className="h-full bg-arav rounded-full animate-pulse-soft" style={{ width: '92%' }} />
            </div>
            <span className="text-xs text-sidebar-foreground/60">92%</span>
          </div>
          <div className="mt-3 text-[10px] text-sidebar-foreground/40 leading-relaxed">
            Permanence over speed.<br />Systems over chaos.
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="flex items-center gap-4 px-4 lg:px-8 py-3.5">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-foreground/70 hover:text-foreground"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-display tracking-wide">EKVAAR OS</span>
              <span className="text-border">/</span>
              <span className="text-foreground font-medium">{activeModuleData?.name}</span>
            </div>
            <div className="flex-1" />
            <div className="relative hidden sm:block w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search the house…"
                className="pl-9 h-8 text-xs bg-muted/50 border-0"
              />
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-agni rounded-full" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-noor text-rui flex items-center justify-center text-[10px] font-medium">
                EK
              </div>
              <div className="hidden md:block text-xs">
                <div className="font-medium">House Operator</div>
                <div className="text-muted-foreground text-[10px]">Founder Circle</div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
            >
              {renderModule()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
