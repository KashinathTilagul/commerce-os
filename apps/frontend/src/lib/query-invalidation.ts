import { QueryClient } from '@tanstack/react-query'

/**
 * Global Query Invalidation Engine for EKVAAR OS.
 * Ensures data consistency across all applications, modules, dashboards, and connectors.
 * When an update occurs anywhere, all connected queries across the system are refreshed instantly.
 */
export function invalidateWorkforceState(queryClient: QueryClient, agentId?: string) {
  queryClient.invalidateQueries({ queryKey: ['workforce-agents'] })
  queryClient.invalidateQueries({ queryKey: ['workforce-issues'] })
  queryClient.invalidateQueries({ queryKey: ['workforce-goals'] })
  queryClient.invalidateQueries({ queryKey: ['workforce-approvals'] })
  queryClient.invalidateQueries({ queryKey: ['workforce-activity'] })
  queryClient.invalidateQueries({ queryKey: ['workforce-settings'] })
  queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  queryClient.invalidateQueries({ queryKey: ['ceo-metrics'] })
  queryClient.invalidateQueries({ queryKey: ['issues'] })
  queryClient.invalidateQueries({ queryKey: ['agents'] })

  if (agentId) {
    queryClient.invalidateQueries({ queryKey: ['workforce-agent', agentId] })
    queryClient.invalidateQueries({ queryKey: ['agent-runs', agentId] })
    queryClient.invalidateQueries({ queryKey: ['agent-run-stats', agentId] })
  }
}
