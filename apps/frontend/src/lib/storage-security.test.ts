import { test } from 'node:test'
import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { readStoredArtifact } from './storage'

test('artifact reads refuse files and symlinks outside storage', async () => {
  const root = path.join(process.cwd(), 'storage')
  await fs.mkdir(root, { recursive: true })
  const dir = await fs.mkdtemp(path.join(root, 'security-test-'))
  try {
    const file = path.join(dir, 'asset.txt')
    await fs.writeFile(file, 'asset')
    assert.equal((await readStoredArtifact(file)).toString(), 'asset')
    await assert.rejects(readStoredArtifact(path.join(process.cwd(), 'package.json')), /outside storage/)
    const link = path.join(dir, 'outside')
    await fs.symlink(path.join(process.cwd(), 'package.json'), link)
    await assert.rejects(readStoredArtifact(link), /outside storage/)
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
})
