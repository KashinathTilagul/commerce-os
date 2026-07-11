'use client'

import { useRef, useState, useEffect, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWindowStore, type WindowState } from '@/lib/window-store'
import { APP_MAP } from './app-registry'

const TOP_BAR_H = 28 // menu bar height
const MIN_W = 720
const MIN_H = 480

export function WindowFrame({ win }: { win: WindowState }) {
  const { focus, close, minimize, toggleMaximize, move, resize, activeId } = useWindowStore()
  const isActive = activeId === win.id
  const app = APP_MAP[win.id]
  const AppComponent = app.component

  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number; dir: string } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [viewport, setViewport] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    const measure = () => setViewport({ w: window.innerWidth, h: window.innerHeight })
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Maximized bounds — only compute on client to avoid SSR mismatch
  const maxBounds = viewport
    ? {
        x: 0,
        y: TOP_BAR_H,
        width: viewport.w,
        height: viewport.h - TOP_BAR_H,
      }
    : { x: 0, y: TOP_BAR_H, width: 1280, height: 720 }

  const bounds = win.isMaximized
    ? viewport
      ? { x: maxBounds.x, y: maxBounds.y, width: maxBounds.width, height: maxBounds.height }
      : { x: 0, y: TOP_BAR_H, width: 1280, height: 720 }
    : { x: win.position.x, y: win.position.y, width: win.size.width, height: win.size.height }

  // Drag handlers
  const handleTitleMouseDown = (e: React.MouseEvent) => {
    if (win.isMaximized) return
    if ((e.target as HTMLElement).closest('[data-traffic-light]')) return
    e.preventDefault()
    focus(win.id)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: win.position.x,
      origY: win.position.y,
    }
    setIsDragging(true)
  }

  useEffect(() => {
    if (!isDragging) return
    const handleMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY
      const newX = dragRef.current.origX + dx
      const newY = Math.max(TOP_BAR_H, dragRef.current.origY + dy)
      move(win.id, { x: newX, y: newY })
    }
    const handleUp = () => {
      setIsDragging(false)
      dragRef.current = null
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [isDragging, win.id, move])

  // Resize handlers
  const handleResizeMouseDown = (e: React.MouseEvent, dir: string) => {
    if (win.isMaximized) return
    e.preventDefault()
    e.stopPropagation()
    focus(win.id)
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origW: win.size.width,
      origH: win.size.height,
      dir,
    }
  }

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!resizeRef.current) return
      const dx = e.clientX - resizeRef.current.startX
      const dy = e.clientY - resizeRef.current.startY
      let newW = resizeRef.current.origW
      let newH = resizeRef.current.origH
      const dir = resizeRef.current.dir
      if (dir.includes('e')) newW = Math.max(MIN_W, resizeRef.current.origW + dx)
      if (dir.includes('s')) newH = Math.max(MIN_H, resizeRef.current.origH + dy)
      if (dir.includes('w')) newW = Math.max(MIN_W, resizeRef.current.origW - dx)
      if (dir.includes('n')) newH = Math.max(MIN_H, resizeRef.current.origH - dy)
      resize(win.id, { width: newW, height: newH })
    }
    const handleUp = () => {
      resizeRef.current = null
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [win.id, resize])

  return (
    <AnimatePresence>
      {!win.isMinimized && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 30 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          onMouseDown={() => focus(win.id)}
          className={`absolute flex flex-col overflow-hidden ${win.isMaximized ? 'rounded-none' : 'rounded-xl'}`}
          style={{
            left: bounds.x,
            top: bounds.y,
            width: bounds.width,
            height: bounds.height,
            zIndex: win.zIndex,
            background: win.isMaximized ? 'var(--window-bg)' : 'rgba(10, 10, 12, 0.45)',
            backdropFilter: win.isMaximized ? 'none' : 'blur(60px) saturate(180%)',
            WebkitBackdropFilter: win.isMaximized ? 'none' : 'blur(60px) saturate(180%)',
            boxShadow: win.isMaximized
              ? 'none'
              : isActive
              ? '0 32px 80px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.15), inset 0 1px 0 rgba(255,255,255,0.2)'
              : '0 16px 48px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.08)',
            border: 'none',
          }}
        >
          {/* Title bar */}
          <div
            className="relative flex items-center h-9 px-3 flex-shrink-0 cursor-grab active:cursor-grabbing"
            style={{
              background: isActive
                ? 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))'
                : 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}
            onMouseDown={handleTitleMouseDown}
            onDoubleClick={() => toggleMaximize(win.id)}
          >
            {/* Traffic lights */}
            <div className="flex items-center gap-2 group" data-traffic-light>
              <TrafficLight
                color="#FF5F57"
                onClick={() => close(win.id)}
                symbol="×"
                active={isActive}
              />
              <TrafficLight
                color="#FEBC2E"
                onClick={() => minimize(win.id)}
                symbol="−"
                active={isActive}
              />
              <TrafficLight
                color="#28C840"
                onClick={() => toggleMaximize(win.id)}
                symbol="+"
                active={isActive}
              />
            </div>

            {/* Centered title */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex items-center gap-2 text-xs text-white/80 font-medium">
                <app.icon className="h-3.5 w-3.5" style={{ color: '#F5F1EA' }} />
                <span className="font-display tracking-tight">{win.title}</span>
                {!isActive && <span className="text-white/40">·</span>}
              </div>
            </div>

            {/* Right side spacer */}
            <div className="ml-auto w-16" />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-transparent">
            <AppComponentWrapper Component={AppComponent} appId={win.id} />
          </div>

          {/* Resize handles */}
          {!win.isMaximized && (
            <>
              <ResizeHandle dir="n" onMouseDown={handleResizeMouseDown} className="top-0 left-2 right-2 h-1 cursor-ns-resize" />
              <ResizeHandle dir="s" onMouseDown={handleResizeMouseDown} className="bottom-0 left-2 right-2 h-1 cursor-ns-resize" />
              <ResizeHandle dir="e" onMouseDown={handleResizeMouseDown} className="right-0 top-2 bottom-2 w-1 cursor-ew-resize" />
              <ResizeHandle dir="w" onMouseDown={handleResizeMouseDown} className="left-0 top-2 bottom-2 w-1 cursor-ew-resize" />
              <ResizeHandle dir="ne" onMouseDown={handleResizeMouseDown} className="top-0 right-0 w-2 h-2 cursor-nesw-resize" />
              <ResizeHandle dir="nw" onMouseDown={handleResizeMouseDown} className="top-0 left-0 w-2 h-2 cursor-nwse-resize" />
              <ResizeHandle dir="se" onMouseDown={handleResizeMouseDown} className="bottom-0 right-0 w-2 h-2 cursor-nwse-resize" />
              <ResizeHandle dir="sw" onMouseDown={handleResizeMouseDown} className="bottom-0 left-0 w-2 h-2 cursor-nesw-resize" />
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function TrafficLight({
  color,
  onClick,
  symbol,
  active,
}: {
  color: string
  onClick: () => void
  symbol: string
  active: boolean
}) {
  return (
    <button
      data-traffic-light
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onMouseDown={(e) => e.stopPropagation()}
      className="h-3 w-3 rounded-full flex items-center justify-center text-[8px] font-bold transition-all"
      style={{
        background: active ? color : 'rgba(120,120,120,0.4)',
        color: 'rgba(0,0,0,0.55)',
        boxShadow: active ? 'inset 0 0 0 0.5px rgba(0,0,0,0.15)' : 'none',
      }}
    >
      <span className="opacity-0 group-hover:opacity-100 transition-opacity leading-none">
        {symbol}
      </span>
    </button>
  )
}

function ResizeHandle({
  dir,
  onMouseDown,
  className,
}: {
  dir: string
  onMouseDown: (e: React.MouseEvent, dir: string) => void
  className: string
}) {
  return (
    <div
      onMouseDown={(e) => onMouseDown(e, dir)}
      className={`absolute z-50 ${className}`}
    />
  )
}

// Renders the app component, passing onNavigate only to components that accept it
function AppComponentWrapper({
  Component,
  appId,
}: {
  Component: React.ComponentType<any>
  appId: string
}) {
  // Components that accept onNavigate
  const props: any = {}
  if (appId === 'command') {
    props.onNavigate = (id: any) => {
      const targetApp = APP_MAP[id as keyof typeof APP_MAP]
      if (targetApp) {
        useWindowStore.getState().open(id, targetApp.name)
      }
    }
  }
  return <Component {...props} />
}
