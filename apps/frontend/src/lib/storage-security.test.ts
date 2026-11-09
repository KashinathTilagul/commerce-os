import { test } from 'node:test'
import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { readStoredArtifact, storageRoot } from './storage'

test('artifact reads refuse files and symlinks outside storage', async () => {
  const root = storageRoot()
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

test('vercel storage root is the writable temp dir', () => {
  const previousVercel = process.env.VERCEL
  const previousDir = process.env.STORAGE_DIR
  delete process.env.STORAGE_DIR
  process.env.VERCEL = '1'
  try {
    assert.equal(storageRoot(), path.join(os.tmpdir(), 'commerce-os-storage'))
  } finally {
    if (previousVercel === undefined) delete process.env.VERCEL
    else process.env.VERCEL = previousVercel
    if (previousDir === undefined) delete process.env.STORAGE_DIR
    else process.env.STORAGE_DIR = previousDir
  }
})
