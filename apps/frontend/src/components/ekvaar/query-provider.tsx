'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 300_000,
            refetchOnWindowFocus: true,
            retry: 1,
            refetchOnMount: true,
            refetchOnReconnect: true,
          },
        },
      }),
  )

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
