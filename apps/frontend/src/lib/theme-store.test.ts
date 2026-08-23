import assert from 'node:assert/strict'
import test from 'node:test'
import { accentForeground, applyTheme, normalizeAccent } from './theme-store'

test('accent color updates the system highlight tokens', () => {
  const properties = new Map<string, string>()
  ;(globalThis as any).window = { matchMedia: () => ({ matches: true }) }
  ;(globalThis as any).document = {
    documentElement: {
      classList: { toggle: () => {} },
      style: { colorScheme: '', setProperty: (name: string, value: string) => properties.set(name, value) },
    },
  }

  applyTheme('dark', '#1F3A5F')
  assert.equal(properties.get('--primary'), '#1F3A5F')
  assert.equal(properties.get('--ring'), '#1F3A5F')
  assert.equal(properties.get('--sidebar-primary'), '#1F3A5F')
  assert.equal(properties.get('--primary-foreground'), '#FFFFFF')
})

test('accent values are normalized and receive readable foregrounds', () => {
  assert.equal(normalizeAccent('#d4859b'), '#D4859B')
  assert.equal(normalizeAccent('not-a-color'), '#C8302A')
  assert.equal(accentForeground('#FFFFFF'), '#0A0A0A')
})
