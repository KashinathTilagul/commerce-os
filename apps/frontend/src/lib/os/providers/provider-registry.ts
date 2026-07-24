import { IProvider } from './base-provider'

class ProviderRegistrySingleton {
  private providers = new Map<string, IProvider>()

  register(provider: IProvider) {
    this.providers.set(provider.toolkitSlug, provider)
  }

  get(toolkitSlug: string): IProvider | undefined {
    return this.providers.get(toolkitSlug)
  }

  getAll(): IProvider[] {
    return Array.from(this.providers.values())
  }
}

export const ProviderRegistry = new ProviderRegistrySingleton()
