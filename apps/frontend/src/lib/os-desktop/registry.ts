import { OSManifest, OSIntent, OSWidget, OSShortcut } from './manifest'

class Registry<T extends { id: string }> {
  private items = new Map<string, T>()

  register(item: T) {
    if (this.items.has(item.id)) {
      console.warn(`[Registry] Item with ID ${item.id} is already registered. Overwriting.`)
    }
    this.items.set(item.id, item)
  }

  unregister(id: string) {
    this.items.delete(id)
  }

  get(id: string): T | undefined {
    return this.items.get(id)
  }

  getAll(): T[] {
    return Array.from(this.items.values())
  }
}

class OSAppRegistry {
  public apps = new Registry<OSManifest>()
  public intents = new Registry<OSIntent>()
  public widgets = new Registry<OSWidget>()
  public shortcuts = new Map<string, OSShortcut>() // Keyed by combo string

  registerManifest(manifest: OSManifest) {
    console.log(`[OSAppRegistry] Registering application: ${manifest.name} (${manifest.id}@${manifest.version})`)
    this.apps.register(manifest)

    if (manifest.intents) {
      manifest.intents.forEach(intent => this.intents.register(intent))
    }

    if (manifest.widgets) {
      manifest.widgets.forEach(widget => this.widgets.register(widget))
    }

    if (manifest.shortcuts) {
      manifest.shortcuts.forEach(shortcut => {
        this.shortcuts.set(shortcut.combo, shortcut)
      })
    }
  }

  getApp(id: string) {
    return this.apps.get(id)
  }

  getAllApps() {
    return this.apps.getAll()
  }
}

export const AppRegistry = new OSAppRegistry()
