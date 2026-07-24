'use client'

import { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { AlertTriangle, Loader2 } from 'lucide-react'

interface PluginSandboxProps {
  pluginId: string
  url: string
  permissions: string[]
}

export function PluginSandbox({ pluginId, url, permissions }: PluginSandboxProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    // Setup postMessage listener for the sandbox RPC
    const handleMessage = (e: MessageEvent) => {
      // Validate origin in a real app, here we assume trusted for MVP
      if (e.data?.source === `plugin-${pluginId}`) {
        console.log(`[Sandbox:${pluginId}] Received message:`, e.data)
        // Delegate to PermissionBroker here
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [pluginId, permissions])

  return (
    <div className="w-full h-full flex flex-col relative bg-background">
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Initializing Sandbox Environment...</p>
          </div>
        </div>
      )}

      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-20">
          <Card className="max-w-md border-destructive/50 bg-destructive/10 p-6 flex flex-col items-center gap-4 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <h3 className="font-semibold text-lg">Sandbox Violation</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </Card>
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          src={url}
          className="w-full h-full border-none flex-1"
          sandbox="allow-scripts allow-same-origin"
          onLoad={() => setLoading(false)}
          onError={() => setError('Failed to load plugin sandbox container.')}
        />
      )}
    </div>
  )
}
