'use client'

import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Loader2 } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { Button } from '@/components/ui/button'
import { useWindowStore } from '@/lib/window-store'
import { DigitalEmployeesHub } from './digital-employees-hub'

type WorkforceConfig = {
  url: string
  configured: boolean
}

export function Workforce() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const openWindow = useWindowStore((state) => state.open)
  const { data, isLoading } = useQuery<WorkforceConfig>({
    queryKey: ['workforce-config'],
    queryFn: async () => {
      const response = await fetch('/api/workforce/config')
      if (!response.ok) return { url: '', configured: false }
      return response.json()
    },
  })

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== iframeRef.current?.contentWindow) return
      if (
        event.data?.source === 'ekvaar-workforce' &&
        event.data?.type === 'ekvaar:open-app' &&
        event.data?.appId === 'integrations'
      ) {
        openWindow('integrations', 'Integrations', { width: 1180, height: 760 })
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [openWindow])

  if (data?.configured) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-[#09090b]">
        <iframe
          ref={iframeRef}
          title="Workforce"
          src={data.url}
          className="h-full w-full border-0 bg-[#09090b]"
          allow="clipboard-read; clipboard-write; microphone; camera"
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="absolute right-3 top-3 z-10 h-8 w-8 bg-background/80 backdrop-blur"
          onClick={() => window.open(data.url, '_blank', 'noopener,noreferrer')}
          aria-label="Open Workforce in a new tab"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background p-8">
        <div className="max-w-md rounded-xl border border-white/[0.08] p-8 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <h2 className="mt-3 font-display text-lg">Starting Workforce…</h2>
        </div>
      </div>
    )
  }

  // Native Workforce hub works out-of-the-box without external Rakazo sidecar.
  return <DigitalEmployeesHub />
}
