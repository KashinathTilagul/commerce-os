'use client'

import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Loader2, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'

type WorkforceConfig = {
  url: string
  configured: boolean
}

export function Workforce() {
  const { data, isLoading, isError, refetch } = useQuery<WorkforceConfig>({
    queryKey: ['workforce-config'],
    queryFn: async () => {
      const response = await fetch('/api/workforce/config')
      if (!response.ok) throw new Error('Workforce configuration unavailable')
      return response.json()
    },
  })

  if (data?.configured) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-[#09090b]">
        <iframe
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

  return (
    <div className="flex h-full w-full items-center justify-center bg-background p-8">
      <div className="max-w-md rounded-xl border border-white/[0.08] p-8 text-center">
        {isLoading ? (
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
        ) : (
          <Users className="mx-auto h-8 w-8 text-muted-foreground" />
        )}
        <h2 className="mt-3 font-display text-lg">
          {isLoading ? 'Starting Workforce…' : 'Workforce is unavailable'}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {isError
            ? 'The OS could not read the Workforce configuration.'
            : 'Start the Rakazo service or configure RAKAZO_PUBLIC_URL for this environment.'}
        </p>
        {!isLoading && (
          <Button type="button" variant="outline" className="mt-5" onClick={() => refetch()}>
            Check again
          </Button>
        )}
      </div>
    </div>
  )
}
