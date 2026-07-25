'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

// ponytail: replaces the old FastAPI WebSocket push channel — Next.js has no
// first-class WS server, and every caller already round-trips through
// react-query, so a periodic invalidate gives the same "live" feel with no
// backend socket to keep up. Swap for real push (SSE) if 30s staleness matters.
export function useAppSubscription(appId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const id = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: [appId] })
    }, 30000)
    return () => clearInterval(id)
  }, [appId, queryClient])
}
