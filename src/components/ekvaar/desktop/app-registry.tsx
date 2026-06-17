'use client'

import {
  LayoutDashboard, Boxes, ShoppingBag, Wallet, Package,
  Users, Megaphone, ShieldCheck, Cpu,
} from 'lucide-react'
import type { AppId } from '@/lib/window-store'
import { CommandCenter } from '@/components/ekvaar/modules/command-center'
import { HouseOfOriginals } from '@/components/ekvaar/modules/house-of-originals'
import { SalesOrders } from '@/components/ekvaar/modules/sales-orders'
import { FinanceModule } from '@/components/ekvaar/modules/finance'
import { InventoryOps } from '@/components/ekvaar/modules/inventory-ops'
import { CommunityModule } from '@/components/ekvaar/modules/community'
import { CampaignsModule } from '@/components/ekvaar/modules/campaigns'
import { BrandGuardian } from '@/components/ekvaar/modules/brand-guardian'
import { AIInfrastructure } from '@/components/ekvaar/modules/ai-infrastructure'

export interface AppDef {
  id: AppId
  name: string
  shortName: string
  icon: any
  gradient: string // CSS gradient for icon background
  glyphColor: string
  component: React.ComponentType<any>
  menuItems: { label: string; items: string[] }[]
}

export const APPS: AppDef[] = [
  {
    id: 'command',
    name: 'Command Center',
    shortName: 'Command',
    icon: LayoutDashboard,
    gradient: 'linear-gradient(135deg, #0A0A0A 0%, #2F4F3A 50%, #C8302A 100%)',
    glyphColor: '#F5F1EA',
    component: CommandCenter,
    menuItems: [
      { label: 'File', items: ['New Brief…', 'Export Dashboard', 'Close Window'] },
      { label: 'View', items: ['Refresh KPIs', 'Compact Mode', 'Fullscreen'] },
      { label: 'Window', items: ['Minimize', 'Zoom', 'Bring All to Front'] },
    ],
  },
  {
    id: 'house',
    name: 'House of Originals',
    shortName: 'House',
    icon: Boxes,
    gradient: 'linear-gradient(135deg, #1F3A5F 0%, #0A0A0A 100%)',
    glyphColor: '#F5F1EA',
    component: HouseOfOriginals,
    menuItems: [
      { label: 'File', items: ['New Original…', 'Import Catalog', 'Close Window'] },
      { label: 'House', items: ['Solids', 'Layers', 'Street', 'Luxe', 'Origins'] },
      { label: 'View', items: ['Grid', 'List', 'Filter by Color'] },
    ],
  },
  {
    id: 'sales',
    name: 'Sales & Orders',
    shortName: 'Sales',
    icon: ShoppingBag,
    gradient: 'linear-gradient(135deg, #C8302A 0%, #8B1E1A 100%)',
    glyphColor: '#F5F1EA',
    component: SalesOrders,
    menuItems: [
      { label: 'File', items: ['New Order…', 'Export Orders', 'Close Window'] },
      { label: 'Order', items: ['Mark Processing', 'Mark Shipped', 'Refund'] },
      { label: 'View', items: ['By Status', 'By Channel', 'By City'] },
    ],
  },
  {
    id: 'finance',
    name: 'Finance',
    shortName: 'Finance',
    icon: Wallet,
    gradient: 'linear-gradient(135deg, #2F4F3A 0%, #1A2F22 100%)',
    glyphColor: '#F5F1EA',
    component: FinanceModule,
    menuItems: [
      { label: 'File', items: ['New Transaction…', 'Generate P&L', 'Export Ledger'] },
      { label: 'Reports', items: ['P&L Statement', 'Cash Flow', 'Balance Sheet'] },
      { label: 'View', items: ['Monthly', 'Quarterly', 'Yearly'] },
    ],
  },
  {
    id: 'inventory',
    name: 'Inventory & Ops',
    shortName: 'Inventory',
    icon: Package,
    gradient: 'linear-gradient(135deg, #1F3A5F 0%, #2F4F3A 100%)',
    glyphColor: '#F5F1EA',
    component: InventoryOps,
    menuItems: [
      { label: 'File', items: ['New SKU…', 'Add Supplier', 'Close Window'] },
      { label: 'Ops', items: ['Restock', 'Pause Production', 'Audit Stock'] },
      { label: 'View', items: ['By House', 'By Supplier', 'Low Stock Only'] },
    ],
  },
  {
    id: 'community',
    name: 'Originals',
    shortName: 'Originals',
    icon: Users,
    gradient: 'linear-gradient(135deg, #D4859B 0%, #8B5468 100%)',
    glyphColor: '#F5F1EA',
    component: CommunityModule,
    menuItems: [
      { label: 'File', items: ['New Member…', 'Invite to House Access', 'Close Window'] },
      { label: 'Community', items: ['Restoration Program', 'Founder Notes', 'Archive Access'] },
      { label: 'View', items: ['Members', 'Restorations', 'Notes'] },
    ],
  },
  {
    id: 'campaigns',
    name: 'Campaigns',
    shortName: 'Campaigns',
    icon: Megaphone,
    gradient: 'linear-gradient(135deg, #0A0A0A 0%, #C8302A 100%)',
    glyphColor: '#F5F1EA',
    component: CampaignsModule,
    menuItems: [
      { label: 'File', items: ['New Campaign…', 'Schedule Post', 'Close Window'] },
      { label: 'Pillar', items: ['Philosophy', 'Product', 'Culture', 'Process', 'Founder', 'Community'] },
      { label: 'View', items: ['Live', 'Drafts', 'Scheduled', 'Archived'] },
    ],
  },
  {
    id: 'guardian',
    name: 'Brand Guardian',
    shortName: 'Guardian',
    icon: ShieldCheck,
    gradient: 'linear-gradient(135deg, #8B7355 0%, #5A4A3A 100%)',
    glyphColor: '#F5F1EA',
    component: BrandGuardian,
    menuItems: [
      { label: 'File', items: ['Run Brand Scan…', 'Export Report', 'Close Window'] },
      { label: 'Guardian', items: ['Palette Check', 'Voice Audit', 'Visual Audit'] },
      { label: 'View', items: ['All Checks', 'Pass', 'Warnings', 'Violations'] },
    ],
  },
  {
    id: 'ai',
    name: 'AI Infrastructure',
    shortName: 'AI Infra',
    icon: Cpu,
    gradient: 'linear-gradient(135deg, #1F3A5F 0%, #D4859B 100%)',
    glyphColor: '#F5F1EA',
    component: AIInfrastructure,
    menuItems: [
      { label: 'File', items: ['Train Model…', 'Run Task', 'Close Window'] },
      { label: 'Systems', items: ['Brand Guardian', 'Content', 'Creative', 'Commerce', 'Founder', 'Product', 'Operations'] },
      { label: 'View', items: ['Health', 'Tasks', 'Logs'] },
    ],
  },
]

export const APP_MAP: Record<AppId, AppDef> = Object.fromEntries(
  APPS.map((a) => [a.id, a]),
) as Record<AppId, AppDef>
