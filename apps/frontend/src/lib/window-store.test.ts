import assert from 'node:assert/strict'
import test from 'node:test'

class MemoryStorage {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

const storage = new MemoryStorage()

test('desktop state survives hydration and is isolated by organization and user', async () => {
  ;(globalThis as any).window = { localStorage: storage }
  ;(globalThis as any).localStorage = storage
  const { desktopStorageKey, hydrateWindowStore, useWindowStore } = await import('./window-store')

  const scope = 'org-ekvaar:user-founder'
  const founderKey = desktopStorageKey(scope)
  assert.notEqual(founderKey, desktopStorageKey('org-ekvaar:user-marketing'))
  assert.notEqual(founderKey, desktopStorageKey('org-other:user-founder'))

  await hydrateWindowStore(scope)
  const windowId = useWindowStore.getState().open('settings', 'Settings')
  useWindowStore.getState().setAppState('agents', { section: 'activity', agentTab: 'runs' })
  const saved = storage.getItem(founderKey)
  assert.ok(saved)

  useWindowStore.setState({ windows: [], activeId: null, appState: {} })
  storage.setItem(founderKey, saved)
  await hydrateWindowStore(scope)

  assert.equal(useWindowStore.getState().activeId, windowId)
  assert.equal(useWindowStore.getState().windows[0]?.appId, 'settings')
  assert.equal(useWindowStore.getState().appState.agents?.section, 'activity')
  assert.equal(useWindowStore.getState().appState.agents?.agentTab, 'runs')
})

test('Workforce never auto-restores at desktop startup', async () => {
  ;(globalThis as any).window = { localStorage: storage }
  ;(globalThis as any).localStorage = storage
  const { desktopStorageKey, hydrateWindowStore, useWindowStore } = await import('./window-store')

  const scope = 'org-ekvaar:user-founder-workforce'
  await hydrateWindowStore(scope)
  const settingsId = useWindowStore.getState().open('settings', 'Settings')
  useWindowStore.getState().open('agents', 'Workforce')
  const saved = storage.getItem(desktopStorageKey(scope))
  assert.ok(saved)

  useWindowStore.setState({ windows: [], activeId: null })
  storage.setItem(desktopStorageKey(scope), saved)
  await hydrateWindowStore(scope)

  assert.deepEqual(useWindowStore.getState().windows.map((window) => window.appId), ['settings'])
  assert.equal(useWindowStore.getState().activeId, settingsId)
})
