'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, useCallback } from 'react'

type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error'
type MessageHandler = (payload: unknown) => void

interface CPUWebSocketState {
  status: WebSocketStatus
  subscribedApps: Set<string>
  lastHeartbeat: Date | null
}

let globalSocket: WebSocket | null = null
let globalReconnectTimer: ReturnType<typeof setTimeout> | null = null
let globalHeartbeatTimer: ReturnType<typeof setInterval> | null = null
const messageHandlers = new Map<string, Set<MessageHandler>>()
let connectionId: string | null = null

function getWebSocketUrl(): string {
  if (typeof window === 'undefined') return ''
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/api/cpu/ws/cpu`
}

function scheduleReconnect(connect: () => void, attempt: number) {
  if (globalReconnectTimer) {
    clearTimeout(globalReconnectTimer)
  }
  const delay = Math.min(1000 * Math.pow(2, attempt), 30000)
  globalReconnectTimer = setTimeout(() => connect(), delay)
}

function startHeartbeat(socket: WebSocket) {
  if (globalHeartbeatTimer) {
    clearInterval(globalHeartbeatTimer)
  }
  globalHeartbeatTimer = setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'heartbeat' }))
    }
  }, 30000)
}

export function useCPUWebSocket() {
  const queryClient = useQueryClient()
  const [state, setState] = useState<CPUWebSocketState>({
    status: 'disconnected',
    subscribedApps: new Set(),
    lastHeartbeat: null,
  })
  const reconnectAttempt = useRef(0)

  const connect = useCallback(() => {
    if (globalSocket?.readyState === WebSocket.OPEN) return

    setState(s => ({ ...s, status: 'connecting' }))
    const url = getWebSocketUrl()

    try {
      globalSocket = new WebSocket(url)

      globalSocket.onopen = () => {
        reconnectAttempt.current = 0
        setState(s => ({ ...s, status: 'connected' }))
        startHeartbeat(globalSocket!)
      }

      globalSocket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          handleMessage(msg, queryClient, setState)
        } catch (e) {
          console.error('[CPU WS] Failed to parse message:', e)
        }
      }

      globalSocket.onclose = () => {
        setState(s => ({ ...s, status: 'disconnected', subscribedApps: new Set() }))
        if (globalHeartbeatTimer) {
          clearInterval(globalHeartbeatTimer)
        }
        scheduleReconnect(connect, reconnectAttempt.current++)
      }

      globalSocket.onerror = () => {
        setState(s => ({ ...s, status: 'error' }))
      }
    } catch (e) {
      setState(s => ({ ...s, status: 'error' }))
      scheduleReconnect(connect, reconnectAttempt.current++)
    }
  }, [queryClient])

  useEffect(() => {
    if (!globalSocket || globalSocket.readyState === WebSocket.CLOSED) {
      connect()
    }

    return () => {
      if (globalReconnectTimer) {
        clearTimeout(globalReconnectTimer)
      }
    }
  }, [connect])

  const subscribe = useCallback((appId: string) => {
    if (!globalSocket || globalSocket.readyState !== WebSocket.OPEN) return
    globalSocket.send(JSON.stringify({ type: 'subscribe', appId }))
    setState(s => {
      const next = new Set(s.subscribedApps)
      next.add(appId)
      return { ...s, subscribedApps: next }
    })
  }, [])

  const unsubscribe = useCallback((appId: string) => {
    if (!globalSocket || globalSocket.readyState !== WebSocket.OPEN) return
    globalSocket.send(JSON.stringify({ type: 'unsubscribe', appId }))
    setState(s => {
      const next = new Set(s.subscribedApps)
      next.delete(appId)
      return { ...s, subscribedApps: next }
    })
  }, [])

  return {
    status: state.status,
    subscribedApps: state.subscribedApps,
    lastHeartbeat: state.lastHeartbeat,
    subscribe,
    unsubscribe,
    reconnect: connect,
  }
}

function handleMessage(
  msg: { type: string; appId?: string; payload?: unknown; timestamp?: string },
  queryClient: ReturnType<typeof useQueryClient>,
  setState: React.Dispatch<React.SetStateAction<CPUWebSocketState>>
) {
  switch (msg.type) {
    case 'heartbeat_ack':
      setState(prev => ({ ...prev, lastHeartbeat: new Date() }))
      break

    case 'app_update':
      if (msg.appId && msg.payload) {
        queryClient.setQueryData([msg.appId], msg.payload)
        const handlers = messageHandlers.get(msg.appId)
        if (handlers) {
          handlers.forEach(h => h(msg.payload))
        }
      }
      break

    case 'sync':
      if (msg.payload && typeof msg.payload === 'object') {
        const payload = msg.payload as Record<string, unknown>
        Object.entries(payload).forEach(([key, value]) => {
          if (key !== 'lastSync') {
            queryClient.setQueryData([key], value)
          }
        })
      }
      break

    case 'notification':
      break
  }
}

export function onAppMessage(appId: string, handler: MessageHandler) {
  if (!messageHandlers.has(appId)) {
    messageHandlers.set(appId, new Set())
  }
  messageHandlers.get(appId)!.add(handler)
  return () => {
    messageHandlers.get(appId)?.delete(handler)
  }
}

export function useAppSubscription(appId: string, handler?: MessageHandler) {
  const { subscribe, unsubscribe, status } = useCPUWebSocket()

  useEffect(() => {
    if (status === 'connected') {
      subscribe(appId)
    }
    return () => {
      if (status === 'connected') {
        unsubscribe(appId)
      }
    }
  }, [appId, status, subscribe, unsubscribe])

  useEffect(() => {
    if (!handler) return
    return onAppMessage(appId, handler)
  }, [appId, handler])
}
