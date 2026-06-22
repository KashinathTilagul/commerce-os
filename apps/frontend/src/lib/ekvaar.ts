// EKVAAR OS — Brand Constants
// India's First All-Time Fashion House

export const EKVAAR_HOUSES = [
  {
    name: 'Solids',
    role: 'Plain essentials',
    description: 'Heavyweight cotton basics. Quiet. Structured. Permanent.',
    icon: 'Circle',
  },
  {
    name: 'Layers',
    role: 'Functional dailywear',
    description: 'Premium fleece. Architectural cuts. Built for daily permanence.',
    icon: 'Layers',
  },
  {
    name: 'Street',
    role: 'Indian graphic expression',
    description: 'Original graphics. Cultural syntax. No meme aesthetics.',
    icon: 'SprayCan',
  },
  {
    name: 'Luxe',
    role: 'Elevated limited pieces',
    description: 'Structured drape. Founder cuts. Limited, never replenished.',
    icon: 'Crown',
  },
  {
    name: 'Origins',
    role: 'Accessories & objects',
    description: 'Reinforced canvas. Cultural objects. The discipline of restraint.',
    icon: 'Box',
  },
] as const

export const EKVAAR_COLORS = [
  { name: 'Noor Black', hex: '#0A0A0A', meaning: 'Silence & power' },
  { name: 'Rui White', hex: '#F5F1EA', meaning: 'Clarity & purity' },
  { name: 'Agni Red', hex: '#C8302A', meaning: 'Energy & movement' },
  { name: 'Neel Blue', hex: '#1F3A5F', meaning: 'Depth & calm' },
  { name: 'Arav Green', hex: '#2F4F3A', meaning: 'Nature & grounding' },
  { name: 'Gulabi Pink', hex: '#D4859B', meaning: 'Emotion & vibrance' },
] as const

export const EKVAAR_COLOR_MAP: Record<string, { hex: string; meaning: string }> = Object.fromEntries(
  EKVAAR_COLORS.map((c) => [c.name, { hex: c.hex, meaning: c.meaning }]),
)

export const EKVAAR_PILLARS = [
  'philosophy',
  'product',
  'culture',
  'process',
  'founder',
  'community',
] as const

export const EKVAAR_PRINCIPLES = [
  'Permanence over speed',
  'Systems over chaos',
  'Identity over trends',
  'Originality over imitation',
  'Restraint over excess',
  'Long-term relevance over virality',
  'Culture over algorithms',
] as const

export const EKVAAR_AI_SYSTEMS = [
  'Brand Guardian',
  'Content',
  'Creative',
  'Commerce',
  'Founder',
  'Product Intelligence',
  'Operations',
] as const

export function formatINR(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n}`
}

export function formatINRFull(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`
}

export function timeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const diff = Date.now() - d.getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  const mo = Math.floor(day / 30)
  return `${mo}mo ago`
}

export const MODULES = [
  { id: 'command', name: 'Command Center', icon: 'LayoutDashboard', group: 'Overview' },
  { id: 'house', name: 'House of Originals', icon: 'Boxes', group: 'Catalog' },
  { id: 'sales', name: 'Sales & Orders', icon: 'ShoppingBag', group: 'Commerce' },
  { id: 'finance', name: 'Finance', icon: 'Wallet', group: 'Commerce' },
  { id: 'inventory', name: 'Inventory & Ops', icon: 'Package', group: 'Commerce' },
  { id: 'community', name: 'Originals (Community)', icon: 'Users', group: 'People' },
  { id: 'campaigns', name: 'Content & Campaigns', icon: 'Megaphone', group: 'Brand' },
  { id: 'guardian', name: 'Brand Guardian', icon: 'ShieldCheck', group: 'Brand' },
  { id: 'ai', name: 'AI Infrastructure', icon: 'Cpu', group: 'Infrastructure' },
] as const

export type ModuleId = typeof MODULES[number]['id']
