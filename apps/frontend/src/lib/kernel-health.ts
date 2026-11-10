export type KernelHealthStatus = 'healthy' | 'degraded' | 'unreachable' | 'not_configured'

export interface KernelHealthProbeResult {
  status: KernelHealthStatus
  configured: boolean
  url?: string
  latencyMs: number
  statusCode?: number
  response?: Record<string, unknown>
  error?: string
}

/**
 * Resolve optional external Python kernel / browser sidecar base URL from env.
 * Returns null when neither FASTAPI_URL nor BROWSER_SIDECAR_URL is configured.
 */
export function resolveKernelUrl(
  env: Record<string, string | undefined> = process.env
): string | null {
  const raw = env.FASTAPI_URL?.trim() || env.BROWSER_SIDECAR_URL?.trim()
  if (!raw) return null
  return raw.replace(/\/+$/, '')
}

/**
 * Probe the optional external kernel service without failing serverless health
 * checks when no kernel URL is configured.
 */
export async function probeKernelHealth(
  env: Record<string, string | undefined> = process.env,
  fetchFn: typeof fetch = fetch
): Promise<KernelHealthProbeResult> {
  const kernelUrl = resolveKernelUrl(env)
  if (!kernelUrl) {
    return {
      status: 'not_configured',
      configured: false,
      latencyMs: 0,
    }
  }

  const start = Date.now()
  try {
    const response = await fetchFn(`${kernelUrl}/`, {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(5000),
    })
    const latencyMs = Date.now() - start

    if (response.ok) {
      const data = await response.json().catch(() => ({}))
      return {
        status: 'healthy',
        configured: true,
        url: kernelUrl,
        latencyMs,
        response: typeof data === 'object' && data !== null ? data : {},
      }
    }

    return {
      status: 'degraded',
      configured: true,
      url: kernelUrl,
      statusCode: response.status,
      latencyMs,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Kernel connection failed'
    return {
      status: 'unreachable',
      configured: true,
      url: kernelUrl,
      latencyMs: Date.now() - start,
      error: message,
    }
  }
}
