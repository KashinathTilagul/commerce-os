'use client'

import {
  LayoutDashboard, Inbox, Users, GitBranch, Terminal as TerminalIcon,
  Settings as SettingsIcon, FolderOpen, Plug,
  Calculator as CalcIcon, StickyNote, Calendar as CalIcon,
  Boxes, ShoppingBag, Wallet, Package, Megaphone, ShieldCheck, Cpu,
  AlertTriangle, Code2, Music,
} from 'lucide-react'
import type { AppId } from '@/lib/window-store'
import { CommandCenter } from '@/components/ekvaar/modules/command-center'
import { FounderInbox } from '@/components/ekvaar/modules/founder-inbox'
import { DigitalEmployeesHub } from '@/components/ekvaar/modules/digital-employees-hub'
import { IssuesModule } from '@/components/ekvaar/modules/issues'
import { TerminalModule } from '@/components/ekvaar/modules/terminal'
import { Settings } from '@/components/ekvaar/modules/settings'
import { Files } from '@/components/ekvaar/modules/files'
import { Integrations } from '@/components/ekvaar/modules/integrations'
import { Calculator } from '@/components/ekvaar/modules/calculator'
import { Notes } from '@/components/ekvaar/modules/notes'
import { CalendarApp } from '@/components/ekvaar/modules/calendar'
import { HouseOfOriginals } from '@/components/ekvaar/modules/house-of-originals'
import { SalesOrders } from '@/components/ekvaar/modules/sales-orders'
import { FinanceModule } from '@/components/ekvaar/modules/finance'
import { InventoryOps } from '@/components/ekvaar/modules/inventory-ops'
import { CommunityModule } from '@/components/ekvaar/modules/community'
import { CampaignsModule } from '@/components/ekvaar/modules/campaigns'
import { BrandGuardian } from '@/components/ekvaar/modules/brand-guardian'
import { AIInfrastructure } from '@/components/ekvaar/modules/ai-infrastructure'
import { RiskCenter } from '@/components/ekvaar/modules/risk-center'
import { SpotifyApp } from '@/components/ekvaar/modules/spotify'

export interface AppDef {
  id: AppId
  name: string
  shortName: string
  icon: any // lucide icon for title bar / fallback
  iconVariant: string // macOS app-icon variant key
  gradient: string // CSS gradient for title bar fallback
  glyphColor: string
  component: React.ComponentType<any>
  menuItems: { label: string; items: string[] }[]
}

export const APPS: AppDef[] = [
  // Core OS apps (left of dock divider)
  {
    id: 'command',
    name: 'Board Room',
    shortName: 'Board',
    icon: LayoutDashboard,
    iconVariant: 'board-room',
    gradient: 'linear-gradient(135deg, #0A0A0A 0%, #2F4F3A 50%, #C8302A 100%)',
    glyphColor: '#F5F1EA',
    component: CommandCenter,
    menuItems: [
      { label: 'File', items: ['New Brief…', 'Export Reality Report', 'Close Window'] },
      { label: 'View', items: ['Refresh KPIs', 'Compact Mode', 'Fullscreen'] },
      { label: 'Window', items: ['Minimize', 'Zoom', 'Bring All to Front'] },
    ],
  },
  {
    id: 'inbox',
    name: 'Founder Inbox',
    shortName: 'Inbox',
    icon: Inbox,
    iconVariant: 'inbox',
    gradient: 'linear-gradient(135deg, #C8302A 0%, #8B1E1A 100%)',
    glyphColor: '#F5F1EA',
    component: FounderInbox,
    menuItems: [
      { label: 'File', items: ['New Approval…', 'Export Inbox', 'Close Window'] },
      { label: 'Inbox', items: ['Mine', 'Unread', 'Recent', 'Blocked'] },
      { label: 'Action', items: ['Approve', 'Reject', 'Request Revision'] },
    ],
  },
  {
    id: 'agents',
    name: 'Digital Employees',
    shortName: 'Agents',
    icon: Users,
    iconVariant: 'agents',
    gradient: 'linear-gradient(135deg, #1F3A5F 0%, #0A0A0A 100%)',
    glyphColor: '#F5F1EA',
    component: DigitalEmployeesHub,
    menuItems: [
      { label: 'File', items: ['Onboard Agent…', 'View Logs', 'Close Window'] },
      { label: 'Agents', items: ['CEO', 'CMO', 'CTO', 'CFO', 'COO', 'CCO', 'CSM', 'Growth', 'Research', 'HR', 'Legal'] },
      { label: 'View', items: ['By Department', 'By Status', 'By Budget'] },
    ],
  },
  {
    id: 'issues',
    name: 'Issues',
    shortName: 'Issues',
    icon: GitBranch,
    iconVariant: 'issues',
    gradient: 'linear-gradient(135deg, #2F4F3A 0%, #1F3A5F 100%)',
    glyphColor: '#F5F1EA',
    component: IssuesModule,
    menuItems: [
      { label: 'File', items: ['New Issue…', 'Export Board', 'Close Window'] },
      { label: 'Issue', items: ['Assign', 'Change Status', 'Add Dependency'] },
      { label: 'View', items: ['Board', 'List', 'Dependencies'] },
    ],
  },
  {
    id: 'terminal',
    name: 'Terminal',
    shortName: 'Terminal',
    icon: TerminalIcon,
    iconVariant: 'terminal',
    gradient: 'linear-gradient(135deg, #0A0A0A 0%, #1F3A5F 100%)',
    glyphColor: '#D4859B',
    component: TerminalModule,
    menuItems: [
      { label: 'File', items: ['Clear Log', 'Export Stream', 'Close Window'] },
      { label: 'Stream', items: ['All Events', 'Info', 'Warnings', 'Critical'] },
      { label: 'View', items: ['Terminal', 'CPU Monitor', 'Agent Logs'] },
    ],
  },
  {
    id: 'settings',
    name: 'Settings',
    shortName: 'Settings',
    icon: SettingsIcon,
    iconVariant: 'settings',
    gradient: 'linear-gradient(135deg, #8E8E93 0%, #48484A 100%)',
    glyphColor: '#F5F1EA',
    component: Settings,
    menuItems: [
      { label: 'File', items: ['Reset Defaults', 'Export Config', 'Close Window'] },
      { label: 'View', items: ['Appearance', 'Intelligence', 'Notifications', 'Governance'] },
      { label: 'Window', items: ['Minimize', 'Zoom'] },
    ],
  },
  {
    id: 'files',
    name: 'Files',
    shortName: 'Files',
    icon: FolderOpen,
    iconVariant: 'files',
    gradient: 'linear-gradient(135deg, #4FB0F5 0%, #1573D6 100%)',
    glyphColor: '#F5F1EA',
    component: Files,
    menuItems: [
      { label: 'File', items: ['New Folder', 'Upload', 'Close Window'] },
      { label: 'View', items: ['Icons', 'List', 'Columns'] },
      { label: 'Go', items: ['Recents', 'Documents', 'Agent Logs', 'Event Ledger'] },
    ],
  },
  {
    id: 'integrations',
    name: 'Integrations',
    shortName: 'Integrations',
    icon: Plug,
    iconVariant: 'integrations',
    gradient: 'linear-gradient(135deg, #5856D6 0%, #3634A3 100%)',
    glyphColor: '#F5F1EA',
    component: Integrations,
    menuItems: [
      { label: 'File', items: ['Refresh', 'Export Connections', 'Close Window'] },
      { label: 'Connect', items: ['Shopify', 'Stripe', 'Gmail', 'GitHub', 'Slack'] },
      { label: 'View', items: ['All', 'Connected', 'By Category'] },
    ],
  },
  // Utilities
  {
    id: 'calculator',
    name: 'Calculator',
    shortName: 'Calc',
    icon: CalcIcon,
    iconVariant: 'calculator',
    gradient: 'linear-gradient(135deg, #3A3A3C 0%, #1C1C1E 100%)',
    glyphColor: '#FF9500',
    component: Calculator,
    menuItems: [
      { label: 'View', items: ['Basic', 'Scientific', 'Programmer'] },
      { label: 'Edit', items: ['Copy', 'Paste', 'Clear'] },
    ],
  },
  {
    id: 'notes',
    name: 'Notes',
    shortName: 'Notes',
    icon: StickyNote,
    iconVariant: 'notes',
    gradient: 'linear-gradient(135deg, #FFCC00 0%, #F5A623 100%)',
    glyphColor: '#F5F1EA',
    component: Notes,
    menuItems: [
      { label: 'File', items: ['New Note', 'Delete', 'Close Window'] },
      { label: 'Format', items: ['Bold', 'Italic', 'Monospace'] },
      { label: 'View', items: ['List', 'Editor'] },
    ],
  },
  {
    id: 'calendar',
    name: 'Calendar',
    shortName: 'Calendar',
    icon: CalIcon,
    iconVariant: 'calendar',
    gradient: 'linear-gradient(135deg, #FFFFFF 0%, #FF3B30 100%)',
    glyphColor: '#F5F1EA',
    component: CalendarApp,
    menuItems: [
      { label: 'File', items: ['New Event', 'Close Window'] },
      { label: 'View', items: ['Day', 'Week', 'Month', 'Year'] },
      { label: 'Go', items: ['Today', 'Next Month', 'Prev Month'] },
    ],
  },
  // Business apps (right of dock divider)
  {
    id: 'house',
    name: 'House of Originals',
    shortName: 'House',
    icon: Boxes,
    iconVariant: 'house',
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
    iconVariant: 'sales',
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
    iconVariant: 'finance',
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
    iconVariant: 'inventory',
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
    iconVariant: 'community',
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
    iconVariant: 'campaigns',
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
    iconVariant: 'guardian',
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
    iconVariant: 'ai',
    gradient: 'linear-gradient(135deg, #1F3A5F 0%, #D4859B 100%)',
    glyphColor: '#F5F1EA',
    component: AIInfrastructure,
    menuItems: [
      { label: 'File', items: ['Train Model…', 'Run Task', 'Close Window'] },
      { label: 'Systems', items: ['Brand Guardian', 'Content', 'Creative', 'Commerce', 'Founder', 'Product', 'Operations'] },
      { label: 'View', items: ['Health', 'Tasks', 'Logs'] },
    ],
  },
  {
    id: 'risk',
    name: 'Risk Center',
    shortName: 'Risk',
    icon: AlertTriangle,
    iconVariant: 'risk',
    gradient: 'linear-gradient(135deg, #C8302A 0%, #D97706 100%)',
    glyphColor: '#F5F1EA',
    component: RiskCenter,
    menuItems: [
      { label: 'File', items: ['Run Assessment', 'Export Report', 'Close Window'] },
      { label: 'Risk', items: ['Critical', 'High', 'Medium', 'Low'] },
      { label: 'View', items: ['Active Risks', 'Signals', 'By Category'] },
    ],
  },
  {
    id: 'spotify',
    name: 'Spotify',
    shortName: 'Spotify',
    icon: Music,
    iconVariant: 'spotify',
    gradient: 'linear-gradient(135deg, #1DB954 0%, #191414 100%)',
    glyphColor: '#1DB954',
    component: SpotifyApp,
    menuItems: [
      { label: 'File', items: ['New Playlist', 'Connect Device', 'Disconnect', 'Close Window'] },
      { label: 'View', items: ['Home', 'Search', 'Your Library', 'Liked Songs'] },
    ],
  },
]

export const APP_MAP: Record<AppId, AppDef> = Object.fromEntries(
  APPS.map((a) => [a.id, a]),
) as Record<AppId, AppDef>

// IDs that belong to the "core OS" group (left of dock divider)
export const CORE_APP_IDS: AppId[] = ['command', 'inbox', 'agents', 'issues', 'terminal', 'settings', 'files', 'integrations']
export const UTILITY_APP_IDS: AppId[] = ['calculator', 'notes', 'calendar']
export const BUSINESS_APP_IDS: AppId[] = ['house', 'sales', 'finance', 'inventory', 'community', 'campaigns', 'guardian', 'ai', 'risk', 'spotify']

