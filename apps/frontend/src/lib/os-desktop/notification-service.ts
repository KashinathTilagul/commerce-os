import { create } from 'zustand'

export interface OSNotification {
  id: string
  appId?: string // Which app sent this, or system
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: number
  read: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

interface NotificationStore {
  notifications: OSNotification[]
  unreadCount: number
  
  publish: (notification: Omit<OSNotification, 'id' | 'timestamp' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clear: (id: string) => void
  clearAll: () => void
}

const generateId = () => Math.random().toString(36).substring(2, 9)

export const useNotificationService = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  publish: (notif) => {
    const id = `notif_${generateId()}`
    const fullNotif: OSNotification = {
      ...notif,
      id,
      timestamp: Date.now(),
      read: false
    }

    set(state => {
      const notifications = [fullNotif, ...state.notifications]
      return {
        notifications,
        unreadCount: notifications.filter(n => !n.read).length
      }
    })

    console.log(`[NotificationService] ${notif.title}: ${notif.message}`)
    // Could also integrate with toast system here if they are separate
  },

  markAsRead: (id) => {
    set(state => {
      const notifications = state.notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      )
      return {
        notifications,
        unreadCount: notifications.filter(n => !n.read).length
      }
    })
  },

  markAllAsRead: () => {
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0
    }))
  },

  clear: (id) => {
    set(state => {
      const notifications = state.notifications.filter(n => n.id !== id)
      return {
        notifications,
        unreadCount: notifications.filter(n => !n.read).length
      }
    })
  },

  clearAll: () => {
    set({ notifications: [], unreadCount: 0 })
  }
}))
