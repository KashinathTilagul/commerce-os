import { OSModule } from './registry'

export interface Capability {
  id: string
  name: string
  description: string
  provider: string // e.g. 'composio'
  toolSlug: string // e.g. 'google_docs_create'
}

class CapabilityRegistrySingleton implements OSModule {
  name = 'CapabilityRegistry'
  private capabilities: Map<string, Capability> = new Map()

  async initialize() {
    console.log('[CapabilityRegistry] Initializing...')
  }

  async health() {
    return { status: 'HEALTHY' as const, latencyMs: 1 }
  }

  register(capability: Capability) {
    this.capabilities.set(capability.id, capability)
  }

  registerMany(capabilities: Capability[]) {
    for (const cap of capabilities) {
      this.capabilities.set(cap.id, cap)
    }
    console.log(`[CapabilityRegistry] Registered ${capabilities.length} capabilities.`)
  }

  get(id: string): Capability | undefined {
    return this.capabilities.get(id)
  }

  findByName(name: string): Capability[] {
    return Array.from(this.capabilities.values()).filter(c => c.name === name || c.name.includes(name))
  }

  getAll(): Capability[] {
    return Array.from(this.capabilities.values())
  }
}

export const CapabilityRegistry = new CapabilityRegistrySingleton()
