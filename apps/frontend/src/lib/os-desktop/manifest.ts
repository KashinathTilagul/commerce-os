import { ReactNode } from 'react'

export interface OSManifest {
  id: string
  name: string
  icon: ReactNode | string // Can be a component or string URL
  description?: string
  version: string
  author?: string
  
  // Lifecycle & Routing
  entryPoint: React.ComponentType<{ appId: string }>
  routes?: { path: string; component: React.ComponentType<any> }[]
  
  // Intents (Command Palette interactions)
  intents?: OSIntent[]
  
  // Desktop integrations
  widgets?: OSWidget[]
  shortcuts?: OSShortcut[]
  notifications?: string[] // Types of notifications it can emit
  
  // Security & Permissions
  permissions: OSPermission[]
  
  // Window defaults
  defaultWindowSize?: { width: number; height: number }
  resizable?: boolean
  maximizable?: boolean
  singleton?: boolean // If true, only one window instance can exist
}

export interface OSIntent {
  id: string
  title: string
  aliases: string[]
  handler: (payload: any) => Promise<void> | void
}

export interface OSWidget {
  id: string
  title: string
  component: React.ComponentType<any>
  defaultSize?: { w: number; h: number }
}

export interface OSShortcut {
  combo: string // e.g. "Ctrl+Shift+N"
  handler: () => void
  global?: boolean
}

export type OSPermission =
  | 'system:notifications'
  | 'system:window'
  | 'system:memory'
  | 'kernel:execute'
  | 'provider:read'
  | 'provider:write'
