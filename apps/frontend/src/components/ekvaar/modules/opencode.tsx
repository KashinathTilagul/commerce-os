'use client'

import { useEffect, useRef, useState } from 'react'
import { Terminal as TermIcon, Maximize2, RefreshCw } from 'lucide-react'

export function OpenCodeApp() {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<any>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const fitRef = useRef<any>(null)
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')

  const connect = () => {
    setStatus('connecting')

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/opencode`)
    ws.binaryType = 'arraybuffer'
    wsRef.current = ws

    ws.onopen = () => setStatus('connected')
    ws.onclose = () => setStatus('disconnected')
    ws.onerror = () => setStatus('disconnected')

    ws.onmessage = (e) => {
      if (termRef.current) {
        termRef.current.write(new Uint8Array(e.data))
      }
    }
  }

  useEffect(() => {
    if (!containerRef.current) return

    let term: any
    let fitAddon: any

    // Dynamic import so SSR doesn't break
    import('xterm').then(({ Terminal }) => {
      import('@xterm/addon-fit').then(({ FitAddon }) => {
        term = new Terminal({
          theme: {
            background: '#0A0A0A',
            foreground: '#F5F1EA',
            cursor: '#C8302A',
            selectionBackground: '#C8302A44',
            black: '#0A0A0A',
            brightBlack: '#3A3A3A',
            red: '#C8302A',
            brightRed: '#E05050',
            green: '#2F4F3A',
            brightGreen: '#4CAF70',
            yellow: '#D4859B',
            brightYellow: '#F0A0B8',
            blue: '#1F3A5F',
            brightBlue: '#4080C0',
            magenta: '#8B7355',
            brightMagenta: '#C8A87A',
            cyan: '#2A6A7A',
            brightCyan: '#40A0B8',
            white: '#D4D0C8',
            brightWhite: '#F5F1EA',
          },
          fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
          fontSize: 13,
          lineHeight: 1.4,
          cursorBlink: true,
          cursorStyle: 'block',
          allowTransparency: false,
          scrollback: 5000,
        })

        fitAddon = new FitAddon()
        term.loadAddon(fitAddon)
        term.open(containerRef.current!)
        fitAddon.fit()

        termRef.current = term
        fitRef.current = fitAddon

        // Send keystrokes to server
        term.onData((data: string) => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(new TextEncoder().encode(data))
          }
        })

        // Resize handler
        const observer = new ResizeObserver(() => {
          try {
            fitAddon.fit()
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                type: 'resize',
                rows: term.rows,
                cols: term.cols,
              }))
            }
          } catch {}
        })
        observer.observe(containerRef.current!)

        connect()

        return () => {
          observer.disconnect()
          term.dispose()
          wsRef.current?.close()
        }
      })
    })

    return () => {
      wsRef.current?.close()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reconnect = () => {
    wsRef.current?.close()
    if (termRef.current) {
      termRef.current.clear()
      termRef.current.write('\r\n\x1b[33mReconnecting...\x1b[0m\r\n')
    }
    connect()
  }

  const fitFullscreen = () => {
    try { fitRef.current?.fit() } catch {}
  }

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-[#111111] shrink-0">
        <TermIcon className="h-3.5 w-3.5 text-[#C8302A]" />
        <span className="text-xs text-[#F5F1EA]/60 font-mono">opencode</span>
        <div className="flex items-center gap-1.5 ml-2">
          <span className={`w-1.5 h-1.5 rounded-full ${
            status === 'connected' ? 'bg-green-500' :
            status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
            'bg-red-500'
          }`} />
          <span className="text-xs text-[#F5F1EA]/40 font-mono">{status}</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={reconnect}
            className="p-1 rounded hover:bg-white/10 text-[#F5F1EA]/40 hover:text-[#F5F1EA]/80 transition-colors"
            title="Reconnect"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
          <button
            onClick={fitFullscreen}
            className="p-1 rounded hover:bg-white/10 text-[#F5F1EA]/40 hover:text-[#F5F1EA]/80 transition-colors"
            title="Refit"
          >
            <Maximize2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Terminal */}
      <div ref={containerRef} className="flex-1 overflow-hidden" style={{ padding: '4px 8px' }} />

      {status === 'disconnected' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="text-center space-y-3">
            <p className="text-[#F5F1EA]/60 text-sm font-mono">Connection lost</p>
            <button
              onClick={reconnect}
              className="px-4 py-2 bg-[#C8302A] text-white text-sm rounded-md hover:bg-[#E05050] transition-colors font-mono"
            >
              Reconnect
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
