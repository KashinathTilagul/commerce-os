/**
 * Window Orchestrator (EKVAAR OS v3.2)
 * 
 * Strict Display & Window Action Execution Manager.
 * ARCHITECTURAL CONSTRAINT: CONTAINS ZERO BUSINESS LOGIC.
 * 
 * Responsibilities:
 * - Executes decisions handed down by ExecutiveIntelligenceEngine.
 * - Window De-duplication: Guarantees exactly ONE living window per workspace (prevents window stacking).
 * - Window Escalation: Updates and focuses existing windows without destroying context.
 */

import { useWindowStore } from '@/lib/window-store'
import { toast } from '@/components/ekvaar/desktop/toast'

export interface WindowOrchestratorAction {
  type: 'OPEN_OR_FOCUS' | 'UPDATE_CONTEXT' | 'BADGE_DOCK' | 'SHOW_TOAST' | 'CLOSE_RESOLVED'
  appId: string
  title: string
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  payload?: any
}

export class WindowOrchestrator {
  /**
   * Executes a window display decision from Executive Intelligence
   */
  static execute(action: WindowOrchestratorAction) {
    const store = useWindowStore.getState()

    switch (action.type) {
      case 'OPEN_OR_FOCUS': {
        // Window De-duplication check: Is there already a living window for this appId?
        const existingWindow = store.windows.find(w => w.appId === action.appId)

        if (existingWindow) {
          // De-duplication & Escalation: Focus existing window and update title/context
          if (existingWindow.isMinimized) {
            store.minimize(existingWindow.id) // restore
          }
          store.focus(existingWindow.id)

          if (action.severity === 'CRITICAL') {
            toast.error(`CRITICAL: ${action.title}`, 'Living window brought to focus.')
          }
          console.log(`[WindowOrchestrator] De-duplicated & Focused existing window [${existingWindow.id}] for ${action.appId}`)
        } else {
          // Open new single living window
          store.open(action.appId, action.title, { width: 1040, height: 720 })
          console.log(`[WindowOrchestrator] Opened new living window for ${action.appId}`)
        }
        break
      }

      case 'UPDATE_CONTEXT': {
        const existingWindow = store.windows.find(w => w.appId === action.appId)
        if (existingWindow) {
          store.focus(existingWindow.id)
          toast.info(`Updated: ${action.title}`, 'Workspace context updated in place.')
        }
        break
      }

      case 'SHOW_TOAST': {
        toast.info(action.title, action.payload?.summary || 'Executive notification raised.')
        break
      }

      case 'CLOSE_RESOLVED': {
        const existingWindow = store.windows.find(w => w.appId === action.appId)
        if (existingWindow) {
          store.close(existingWindow.id)
          toast.success('Resolved', `Closed ${action.title} workspace.`)
        }
        break
      }

      default:
        break
    }
  }
}
