import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

const json = (res, status, value) => { const body = JSON.stringify(value); res.writeHead(status, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) }); res.end(body) }
const run = (args) => new Promise((resolve, reject) => {
  const child = spawn('gws', args, { stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 })
  let stdout = '', stderr = ''
  child.stdout.on('data', (data) => { stdout += data; if (stdout.length > 2_000_000) child.kill() })
  child.stderr.on('data', (data) => { stderr += data; if (stderr.length > 100_000) child.kill() })
  child.on('error', reject)
  child.on('close', (code) => code === 0 ? resolve({ stdout }) : reject(new Error(stderr || stdout || `gws exited ${code}`)))
})

createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') return json(res, 200, { status: 'ok', authenticated: existsSync('/root/.config/gws') })
  if (req.method !== 'POST' || req.url !== '/execute') return json(res, 404, { error: 'not found' })
  if (!process.env.CRON_SECRET || req.headers['x-cron-secret'] !== process.env.CRON_SECRET) return json(res, 401, { error: 'Unauthorized' })
  let body = ''
  req.on('data', (chunk) => { body += chunk; if (body.length > 200000) req.destroy() })
  req.on('end', async () => {
    try {
      const args = JSON.parse(body).args
      if (!Array.isArray(args) || !args.length || args.length > 30 || args.some((arg) => typeof arg !== 'string' || arg.length > 500) || args[0] === 'auth') return json(res, 400, { error: 'Invalid or forbidden gws arguments' })
      const result = await run([...args, '--format', 'json'])
      json(res, 200, { result: JSON.parse(result.stdout) })
    } catch (error) { json(res, 502, { error: error.message }) }
  })
}).listen(8091, '0.0.0.0')
