/**
 * Service Registry
 * 
 * Manages all OS services. The Kernel uses this to retrieve active services
 * instead of instantiating them directly.
 */

// Base interface all OS modules must implement
export interface OSModule {
  name: string
  initialize(): Promise<void>
  health(): Promise<{ status: 'HEALTHY' | 'DEGRADED' | 'OFFLINE'; latencyMs: number }>
}

// Minimal Interface for Event Dispatcher (Phase 1.1)
export interface IEventDispatcher extends OSModule {
  publish(event: { type: string; source: string; payload: any }): Promise<void>
}

// Registry singleton to hold active services
class Registry {
  private services: Map<string, OSModule> = new Map()

  register(service: OSModule) {
    console.log(`[Registry] Registering service: ${service.name}`)
    this.services.set(service.name, service)
  }

  get<T extends OSModule>(name: string): T {
    const service = this.services.get(name)
    if (!service) {
      throw new Error(`[Registry] Service not found: ${name}`)
    }
    return service as T
  }

  async initializeAll() {
    console.log(`[Registry] Initializing ${this.services.size} services...`)
    for (const [name, service] of this.services.entries()) {
      await service.initialize()
      console.log(`[Registry] Service ${name} initialized.`)
    }
  }
}

export const ServiceRegistry = new Registry()
