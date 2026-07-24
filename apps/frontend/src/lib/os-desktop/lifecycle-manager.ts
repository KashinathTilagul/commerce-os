import { create } from 'zustand'

export type AppLifecycleState = 
  | 'INSTALLING'
  | 'REGISTERED'
  | 'INITIALIZED'
  | 'RUNNING'
  | 'BACKGROUND'
  | 'SUSPENDED'
  | 'UPDATING'
  | 'DISABLED'
  | 'UNINSTALLED'

interface AppInstance {
  instanceId: string
  appId: string
  state: AppLifecycleState
  startedAt: number
}

interface LifecycleState {
  instances: Record<string, AppInstance>
  
  // Actions
  startApp: (appId: string) => string
  terminateApp: (instanceId: string) => void
  setAppState: (instanceId: string, state: AppLifecycleState) => void
}

const generateId = () => Math.random().toString(36).substring(2, 9)

export const useLifecycleManager = create<LifecycleState>((set, get) => ({
  instances: {},
  
  startApp: (appId) => {
    // Check if singleton and already running? (Will need AppRegistry access, keeping it simple for now)
    const instanceId = `${appId}_${generateId()}`
    set(state => ({
      instances: {
        ...state.instances,
        [instanceId]: {
          instanceId,
          appId,
          state: 'RUNNING',
          startedAt: Date.now()
        }
      }
    }))
    console.log(`[LifecycleManager] Started ${appId} (Instance: ${instanceId})`)
    return instanceId
  },

  terminateApp: (instanceId) => {
    set(state => {
      const newInstances = { ...state.instances }
      delete newInstances[instanceId]
      return { instances: newInstances }
    })
    console.log(`[LifecycleManager] Terminated ${instanceId}`)
  },

  setAppState: (instanceId, appState) => {
    set(state => ({
      instances: {
        ...state.instances,
        [instanceId]: {
          ...state.instances[instanceId],
          state: appState
        }
      }
    }))
  }
}))
