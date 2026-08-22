'use client'

import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, Inbox, Users, Terminal as TerminalIcon,
  Settings as SettingsIcon, FolderOpen, Plug,
  Calculator as CalcIcon, StickyNote, Calendar as CalIcon,
  ShoppingBag, Wallet, Package, Megaphone, ShieldCheck, Cpu,
  AlertTriangle, Music, Activity, Brain, Rocket, Loader2, Sparkles
} from 'lucide-react'

import dynamic from 'next/dynamic'
import { OSManifest } from '@/lib/os-desktop/manifest'

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full w-full bg-background text-muted-foreground gap-2 p-8">
    <Loader2 className="h-5 w-5 animate-spin" />
    <span className="text-xs">Loading module...</span>
  </div>
)

const CommandCenter = dynamic(() => import('@/components/ekvaar/modules/command-center').then(m => m.CommandCenter), { loading: LoadingFallback })
const Chat = dynamic(() => import('@/components/ekvaar/modules/chat').then(m => m.Chat), { loading: LoadingFallback })
const DigitalEmployeesHub = dynamic(() => import('@/components/ekvaar/modules/digital-employees-hub').then(m => m.DigitalEmployeesHub), { loading: LoadingFallback })
const TerminalModule = dynamic(() => import('@/components/ekvaar/modules/terminal').then(m => m.TerminalModule), { loading: LoadingFallback })
const Settings = dynamic(() => import('@/components/ekvaar/modules/settings').then(m => m.Settings), { loading: LoadingFallback })
const Files = dynamic(() => import('@/components/ekvaar/modules/files').then(m => m.Files), { loading: LoadingFallback })
const Integrations = dynamic(() => import('@/components/ekvaar/modules/integrations').then(m => m.Integrations), { loading: LoadingFallback })
const Calculator = dynamic(() => import('@/components/ekvaar/modules/calculator').then(m => m.Calculator), { loading: LoadingFallback })
const Notes = dynamic(() => import('@/components/ekvaar/modules/notes').then(m => m.Notes), { loading: LoadingFallback })
const NativeMarketingAutomation = dynamic(() => import('@/components/ekvaar/modules/native-marketing-automation').then(m => m.NativeMarketingAutomation), { loading: LoadingFallback })
const CalendarApp = dynamic(() => import('@/components/ekvaar/modules/calendar').then(m => m.CalendarApp), { loading: LoadingFallback })
const SalesOrders = dynamic(() => import('@/components/ekvaar/modules/sales-orders').then(m => m.SalesOrders), { loading: LoadingFallback })
const FinanceModule = dynamic(() => import('@/components/ekvaar/modules/finance').then(m => m.FinanceModule), { loading: LoadingFallback })
const InventoryOps = dynamic(() => import('@/components/ekvaar/modules/inventory-ops').then(m => m.InventoryOps), { loading: LoadingFallback })
const CommunityModule = dynamic(() => import('@/components/ekvaar/modules/community').then(m => m.CommunityModule), { loading: LoadingFallback })
const CampaignsModule = dynamic(() => import('@/components/ekvaar/modules/campaigns').then(m => m.CampaignsModule), { loading: LoadingFallback })
const BrandIntelligence = dynamic(() => import('@/components/ekvaar/modules/brand-intelligence').then(m => m.BrandIntelligence), { loading: LoadingFallback })
const AIInfrastructure = dynamic(() => import('@/components/ekvaar/modules/ai-infrastructure').then(m => m.AIInfrastructure), { loading: LoadingFallback })
const RiskCenter = dynamic(() => import('@/components/ekvaar/modules/risk-center').then(m => m.RiskCenter), { loading: LoadingFallback })
const SpotifyApp = dynamic(() => import('@/components/ekvaar/modules/spotify').then(m => m.SpotifyApp), { loading: LoadingFallback })
const HealthMonitor = dynamic(() => import('@/components/ekvaar/modules/health-monitor').then(m => m.HealthMonitor), { loading: LoadingFallback })
const WorkspaceExplorer = dynamic(() => import('@/components/ekvaar/modules/workspace-explorer').then(m => m.WorkspaceExplorer), { loading: LoadingFallback })
const MemoryExplorer = dynamic(() => import('@/components/ekvaar/modules/memory-explorer').then(m => m.MemoryExplorer), { loading: LoadingFallback })
const ProductLaunches = dynamic(() => import('@/components/ekvaar/modules/product-launches').then(m => m.ProductLaunches), { loading: LoadingFallback })

// To bridge legacy metadata that isn't in OSManifest yet
export interface AppDef extends OSManifest {
  shortName: string
  gradient: string
  glyphColor: string
  iconVariant?: string
  organizationOnly?: string[]
  menuItems: { label: string; items: string[] }[]
}

export const APPS: AppDef[] = [
  // Core OS apps
  {
    id: 'health',
    name: 'Health Monitor',
    shortName: 'Health',
    version: '1.0.0',
    icon: Activity as any,
    iconVariant: 'health',
    category: 'core',
    requiredCapabilities: [],
    entryPoint: HealthMonitor,
    permissions: [],
    gradient: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 50%, #4CAF50 100%)',
    glyphColor: '#F5F1EA',
    menuItems: [{ label: 'File', items: ['Export Logs', 'Close Window'] }]
  },
  {
    id: 'memory',
    name: 'Memory Explorer',
    shortName: 'Memory',
    version: '1.0.0',
    icon: Brain as any,
    iconVariant: 'memory',
    category: 'core',
    requiredCapabilities: [],
    entryPoint: MemoryExplorer,
    permissions: [],
    gradient: 'linear-gradient(135deg, #0A0A0A 0%, #2F4F3A 50%, #1E90FF 100%)',
    glyphColor: '#F5F1EA',
    menuItems: [{ label: 'File', items: ['Export Graph', 'Close Window'] }]
  },
  {
    id: 'explorer',
    name: 'Knowledge Drive', // Renamed from Workspace Explorer
    shortName: 'Drive',
    version: '1.0.0',
    icon: FolderOpen as any,
    iconVariant: 'drive',
    category: 'core',
    requiredCapabilities: [],
    entryPoint: WorkspaceExplorer,
    permissions: [],
    gradient: 'linear-gradient(135deg, #0A0A0A 0%, #2F4F3A 50%, #1E90FF 100%)',
    glyphColor: '#F5F1EA',
    menuItems: [{ label: 'File', items: ['New Workspace...', 'Close Window'] }]
  },
  {
    id: 'command',
    name: 'Command Center', // Renamed from Board Room
    shortName: 'Command',
    version: '1.0.0',
    icon: LayoutDashboard as any,
    iconVariant: 'board-room',
    category: 'core',
    requiredCapabilities: [],
    entryPoint: CommandCenter as any,
    permissions: [],
    gradient: 'linear-gradient(135deg, #0A0A0A 0%, #2F4F3A 50%, #C8302A 100%)',
    glyphColor: '#F5F1EA',
    menuItems: [{ label: 'File', items: ['Export Report', 'Close Window'] }]
  },
  {
    id: 'agents',
    name: 'AI Workforce',
    shortName: 'Workforce',
    version: '1.0.0',
    icon: Users as any,
    iconVariant: 'agents',
    category: 'core',
    requiredCapabilities: [],
    entryPoint: DigitalEmployeesHub,
    permissions: [],
    gradient: 'linear-gradient(135deg, #1F3A5F 0%, #0A0A0A 100%)',
    glyphColor: '#F5F1EA',
    menuItems: [{ label: 'File', items: ['Close Window'] }]
  },
  {
    id: 'terminal',
    name: 'Terminal',
    shortName: 'Terminal',
    version: '1.0.0',
    icon: TerminalIcon as any,
    iconVariant: 'terminal',
    category: 'core',
    requiredCapabilities: [],
    entryPoint: TerminalModule,
    permissions: [],
    gradient: 'linear-gradient(135deg, #0A0A0A 0%, #1F3A5F 100%)',
    glyphColor: '#D4859B',
    menuItems: [{ label: 'File', items: ['Close Window'] }]
  },
  {
    id: 'settings',
    name: 'Settings',
    shortName: 'Settings',
    version: '1.0.0',
    icon: SettingsIcon as any,
    iconVariant: 'settings',
    category: 'core',
    requiredCapabilities: [],
    entryPoint: Settings,
    permissions: [],
    gradient: 'linear-gradient(135deg, #8E8E93 0%, #48484A 100%)',
    glyphColor: '#F5F1EA',
    menuItems: [{ label: 'File', items: ['Close Window'] }]
  },
  {
    id: 'files',
    name: 'Notes & Logs',
    shortName: 'Logs',
    version: '1.0.0',
    icon: FolderOpen as any,
    iconVariant: 'files',
    category: 'core',
    requiredCapabilities: [],
    entryPoint: Files,
    permissions: [],
    gradient: 'linear-gradient(135deg, #4FB0F5 0%, #1573D6 100%)',
    glyphColor: '#F5F1EA',
    menuItems: [{ label: 'File', items: ['Close Window'] }]
  },
  {
    id: 'integrations',
    name: 'Integrations',
    shortName: 'Integrations',
    version: '1.0.0',
    icon: Plug as any,
    iconVariant: 'integrations',
    category: 'core',
    requiredCapabilities: [],
    entryPoint: Integrations,
    permissions: [],
    gradient: 'linear-gradient(135deg, #5856D6 0%, #3634A3 100%)',
    glyphColor: '#F5F1EA',
    menuItems: [{ label: 'File', items: ['Close Window'] }]
  },
{
    id: 'product-launches',
    name: 'Product Launches',
    shortName: 'Launches',
    version: '1.0.0',
    icon: Rocket as any,
    iconVariant: 'launches',
    category: 'business',
    requiredCapabilities: [],
    entryPoint: ProductLaunches,
    permissions: [],
    gradient: 'linear-gradient(135deg, #1F3A5F 0%, #2F4F3A 55%, #C8302A 100%)',
    glyphColor: '#F5F1EA',
    menuItems: []
  },
  // Utilities
  {
    id: 'marketing',
    name: 'Content Studio',
    shortName: 'Content',
    version: '1.0.0',
    icon: Sparkles as any,
    iconVariant: 'campaigns',
    category: 'core',
    requiredCapabilities: [],
    entryPoint: NativeMarketingAutomation,
    permissions: [],
    gradient: 'linear-gradient(135deg, #FF3B6B 0%, #7C3AED 100%)',
    glyphColor: '#F5F1EA',
    menuItems: []
  },
  {
    id: 'calculator',
    name: 'Calculator',
    shortName: 'Calc',
    version: '1.0.0',
    icon: CalcIcon as any,
    iconVariant: 'calculator',
    category: 'utility',
    requiredCapabilities: [],
    entryPoint: Calculator,
    permissions: [],
    gradient: 'linear-gradient(135deg, #3A3A3C 0%, #1C1C1E 100%)',
    glyphColor: '#FF9500',
    menuItems: []
  },
  {
    id: 'notes',
    name: 'Notes',
    shortName: 'Notes',
    version: '1.0.0',
    icon: StickyNote as any,
    iconVariant: 'notes',
    category: 'utility',
    requiredCapabilities: [],
    entryPoint: Notes,
    permissions: [],
    gradient: 'linear-gradient(135deg, #FFCC00 0%, #F5A623 100%)',
    glyphColor: '#F5F1EA',
    menuItems: []
  },
  {
    id: 'calendar',
    name: 'Calendar',
    shortName: 'Calendar',
    version: '1.0.0',
    icon: CalIcon as any,
    iconVariant: 'calendar',
    category: 'utility',
    requiredCapabilities: [],
    entryPoint: CalendarApp,
    permissions: [],
    gradient: 'linear-gradient(135deg, #FFFFFF 0%, #FF3B30 100%)',
    glyphColor: '#F5F1EA',
    menuItems: []
  },

  // Business apps
  {
    id: 'sales',
    name: 'Sales & Orders',
    shortName: 'Sales',
    version: '1.0.0',
    icon: ShoppingBag as any,
    iconVariant: 'sales',
    category: 'business',
    requiredCapabilities: [],
    entryPoint: SalesOrders,
    permissions: [],
    gradient: 'linear-gradient(135deg, #C8302A 0%, #8B1E1A 100%)',
    glyphColor: '#F5F1EA',
    menuItems: []
  },
  {
    id: 'finance',
    name: 'Finance',
    shortName: 'Finance',
    version: '1.0.0',
    icon: Wallet as any,
    iconVariant: 'finance',
    category: 'business',
    requiredCapabilities: [],
    entryPoint: FinanceModule,
    permissions: [],
    gradient: 'linear-gradient(135deg, #2F4F3A 0%, #1A2F22 100%)',
    glyphColor: '#F5F1EA',
    menuItems: []
  },
  {
    id: 'inventory',
    name: 'Inventory & Ops',
    shortName: 'Inventory',
    version: '1.0.0',
    icon: Package as any,
    iconVariant: 'inventory',
    category: 'business',
    requiredCapabilities: [],
    entryPoint: InventoryOps,
    permissions: [],
    gradient: 'linear-gradient(135deg, #1F3A5F 0%, #2F4F3A 100%)',
    glyphColor: '#F5F1EA',
    menuItems: []
  },
  {
    id: 'community',
    name: 'Customers',
    shortName: 'Customers',
    version: '1.0.0',
    icon: Users as any,
    iconVariant: 'community',
    category: 'business',
    requiredCapabilities: [],
    entryPoint: CommunityModule,
    permissions: [],
    gradient: 'linear-gradient(135deg, #D4859B 0%, #8B5468 100%)',
    glyphColor: '#F5F1EA',
    menuItems: []
  },
  {
    id: 'campaigns',
    name: 'Campaigns',
    shortName: 'Campaigns',
    version: '1.0.0',
    icon: Megaphone as any,
    iconVariant: 'campaigns',
    category: 'business',
    requiredCapabilities: [],
    entryPoint: CampaignsModule,
    permissions: [],
    gradient: 'linear-gradient(135deg, #0A0A0A 0%, #C8302A 100%)',
    glyphColor: '#F5F1EA',
    menuItems: []
  },
  {
    id: 'brand-intelligence',
    name: 'Brand Intelligence',
    shortName: 'Intelligence',
    version: '1.0.0',
    icon: ShieldCheck as any,
    iconVariant: 'guardian',
    category: 'business',
    requiredCapabilities: [],
    entryPoint: BrandIntelligence,
    permissions: [],
    gradient: 'linear-gradient(135deg, #8B7355 0%, #5A4A3A 100%)',
    glyphColor: '#F5F1EA',
    menuItems: []
  },
  {
    id: 'ai',
    name: 'AI Infrastructure',
    shortName: 'AI Infra',
    version: '1.0.0',
    icon: Cpu as any,
    iconVariant: 'ai',
    category: 'business',
    requiredCapabilities: [],
    entryPoint: AIInfrastructure,
    permissions: [],
    gradient: 'linear-gradient(135deg, #1F3A5F 0%, #D4859B 100%)',
    glyphColor: '#F5F1EA',
    menuItems: []
  },
  {
    id: 'risk',
    name: 'Risk Center',
    shortName: 'Risk',
    version: '1.0.0',
    icon: AlertTriangle as any,
    iconVariant: 'risk',
    category: 'business',
    requiredCapabilities: [],
    entryPoint: RiskCenter,
    permissions: [],
    gradient: 'linear-gradient(135deg, #C8302A 0%, #D97706 100%)',
    glyphColor: '#F5F1EA',
    menuItems: []
  },
  {
    id: 'spotify',
    name: 'Spotify',
    shortName: 'Spotify',
    version: '1.0.0',
    icon: Music as any,
    iconVariant: 'spotify',
    category: 'marketplace',
    requiredCapabilities: [],
    entryPoint: SpotifyApp,
    permissions: [],
    gradient: 'linear-gradient(135deg, #1DB954 0%, #191414 100%)',
    glyphColor: '#1DB954',
    menuItems: []
  },
]

export const APP_MAP: Record<string, AppDef> = APPS.reduce((acc, app) => {
  acc[app.id] = app
  return acc
}, {} as Record<string, AppDef>)

// Hook for fetching dynamically available apps based on organization capabilities
export function useAvailableApps() {
  const { data: capabilities = [], isLoading } = useQuery({
    queryKey: ['capabilities'],
    queryFn: async () => {
      const res = await fetch('/api/organization/capabilities')
      if (!res.ok) throw new Error('Failed to fetch capabilities')
      return res.json()
    }
  })
  const { data: setup } = useQuery({
    queryKey: ['onboarding'],
    queryFn: async () => {
      const res = await fetch('/api/onboarding')
      if (!res.ok) throw new Error('Failed to fetch organization')
      return res.json()
    }
  })
  const organizationMarker = `${setup?.organization?.slug || ''} ${setup?.organization?.name || ''}`.toLowerCase()

  // Filter apps that require capabilities the org doesn't have
  const availableApps = APPS.filter(app => {
    if (app.organizationOnly?.length && !app.organizationOnly.some((org) => organizationMarker.includes(org))) return false
    // If the app doesn't require any capabilities, it's available
    if (!app.requiredCapabilities || app.requiredCapabilities.length === 0) return true
    
    // Otherwise, org must have ALL required capabilities
    const capabilityNames = capabilities.map((c: any) => c.name)
    return app.requiredCapabilities.every(req => capabilityNames.includes(req))
  })

  const coreAppIds = availableApps.filter(a => a.category === 'core').map(a => a.id)
  const utilityAppIds = availableApps.filter(a => a.category === 'utility').map(a => a.id)
  const businessAppIds = availableApps.filter(a => a.category === 'business').map(a => a.id)
  const marketplaceAppIds = availableApps.filter(a => a.category === 'marketplace').map(a => a.id)

  return {
    apps: availableApps,
    coreAppIds,
    utilityAppIds,
    businessAppIds,
    marketplaceAppIds,
    isLoading
  }
}
