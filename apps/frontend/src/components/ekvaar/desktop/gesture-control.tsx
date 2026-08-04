'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Hand } from 'lucide-react'
import type { FrameDebug, TrackerStatus, Pose } from '@/lib/hand-tracker'
import { PINCH_ON } from '@/lib/hand-tracker'

const POSE_LABEL: Record<Pose, string> = {
  pinch: 'SCROLL', fist: 'CLOSING WINDOW…', open: '', point: '', none: '',
}
const POSE_COLOR: Record<Pose, string> = {
  pinch: '#34C759', fist: '#FF3B30', open: '#5856D6', point: '#5856D6', none: '#5856D6',
}

// ─── Gesture control — opt-in pinch-to-activate via webcam ─────────────────
export function GestureControl({ onBackgroundPinch }: { onBackgroundPinch: () => void }) {
  const [enabled, setEnabled] = useState(false)
  const [debug, setDebug] = useState(false)
  const [frame, setFrame] = useState<FrameDebug | null>(null)
  const [trackerStatus, setTrackerStatus] = useState<TrackerStatus | null>(null)
  const [trackerError, setTrackerError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Draw landmarks on canvas each frame
  useEffect(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video || !frame) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(-1, 1)
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
    ctx.restore()
    if (!frame.handDetected) return
    frame.landmarks.forEach((lm) => {
      const x = (1 - lm.x) * canvas.width
      const y = lm.y * canvas.height
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fillStyle = frame.pinching ? '#34C759' : '#5856D6'
      ctx.fill()
    })
    const thumb = frame.landmarks[4]
    const index = frame.landmarks[8]
    if (thumb && index) {
      [thumb, index].forEach((lm) => {
        ctx.beginPath()
        ctx.arc((1 - lm.x) * canvas.width, lm.y * canvas.height, 7, 0, Math.PI * 2)
        ctx.fillStyle = '#FF9F0A'
        ctx.fill()
      })
    }
  }, [frame])

  useEffect(() => {
    if (!enabled) { setTrackerStatus(null); setTrackerError(null); setFrame(null); return }
    const video = videoRef.current
    if (!video) return
    let cancelled = false
    let tracker: { stop(): void; start(): Promise<void> } | undefined
    import('@/lib/hand-tracker')
      .then(({ OSGestureController }) => {
        if (cancelled) return
        tracker = new OSGestureController(
          video,
          setFrame,
          (s, detail) => { setTrackerStatus(s); if (detail) setTrackerError(detail) },
          onBackgroundPinch,
        )
        tracker.start()
      })
      .catch((e) => { if (!cancelled) { setTrackerStatus('error'); setTrackerError(String(e)) } })
    return () => { cancelled = true; tracker?.stop() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  return (
    <div
      className="fixed z-[8500] pointer-events-none"
      style={{ bottom: 24, right: 24, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}
    >
      <video
        ref={videoRef}
        playsInline muted
        width={320} height={240}
        style={{ position: 'fixed', top: 0, left: 0, width: 320, height: 240, opacity: 0, pointerEvents: 'none', zIndex: -1 }}
      />

      {/* Debug panel — camera feed + landmarks + ratio */}
      {debug && enabled && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-auto"
          style={{
            background: 'rgba(0,0,0,0.9)',
            border: '1px solid rgba(88,86,214,0.3)',
            borderRadius: 12, padding: 10,
            display: 'flex', flexDirection: 'column', gap: 8,
            width: 320,
          }}
        >
          <canvas ref={canvasRef} width={320} height={240}
            style={{ borderRadius: 8, width: '100%', display: 'block' }} />
          {frame && (
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.7)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>HAND</span>
                <span style={{ color: frame.handDetected ? '#34C759' : '#FF3B30' }}>
                  {frame.handDetected ? 'DETECTED' : 'NOT DETECTED'}
                </span>
              </div>
              {frame.handDetected && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>RATIO</span>
                    <span style={{ color: frame.ratio < PINCH_ON ? '#34C759' : frame.ratio < 0.4 ? '#FF9F0A' : 'rgba(255,255,255,0.8)' }}>
                      {frame.ratio.toFixed(3)}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>/ trigger at &lt;{PINCH_ON}</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      width: `${Math.min(frame.ratio * 150, 100)}%`,
                      background: frame.pinching ? '#34C759' : frame.ratio < PINCH_ON ? '#34C759' : '#5856D6',
                      transition: 'width 0.05s ease',
                    }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>POSE</span>
                    <span style={{ color: POSE_COLOR[frame.pose] }}>
                      {POSE_LABEL[frame.pose] || 'idle'}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
          <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
            PINCH = scroll · PINCH on desktop = open Krishna · FIST hold = close window
          </div>
        </motion.div>
      )}

      {/* Status pill — click to toggle debug panel */}
      {trackerStatus && (
        <motion.button
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setDebug(d => !d)}
          className="pointer-events-auto"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: trackerStatus === 'error' ? 'rgba(255,59,48,0.15)' : debug ? 'rgba(88,86,214,0.3)' : 'rgba(0,0,0,0.5)',
            border: `1px solid ${trackerStatus === 'error' ? 'rgba(255,59,48,0.5)' : debug ? 'rgba(88,86,214,0.6)' : 'rgba(52,199,89,0.35)'}`,
            borderRadius: 10, padding: '3px 10px',
            cursor: 'pointer', maxWidth: 320, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
          title={trackerError || undefined}
        >
          <motion.div
            style={{
              width: 5, height: 5, borderRadius: '50%',
              background: trackerStatus === 'ready' ? '#34C759' : trackerStatus === 'error' ? '#FF3B30' : '#FF9F0A',
            }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace', letterSpacing: '0.08em' }}>
            {trackerStatus === 'requesting-camera' && 'REQUESTING CAMERA…'}
            {trackerStatus === 'loading-model' && 'LOADING GESTURE MODEL…'}
            {trackerStatus === 'ready' && (debug ? 'HIDE DEBUG' : 'GESTURE ACTIVE')}
            {trackerStatus === 'error' && `CAMERA ERROR: ${trackerError || 'unknown'}`}
          </span>
        </motion.button>
      )}

      {/* Manual toggle — camera only turns on when clicked */}
      <button
        onClick={() => setEnabled(e => !e)}
        className="pointer-events-auto flex items-center justify-center transition-colors"
        title={enabled ? 'Disable hand gesture control' : 'Enable hand gesture control'}
        style={{
          width: 40, height: 40, borderRadius: '50%',
          background: enabled ? 'rgba(52,199,89,0.2)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${enabled ? 'rgba(52,199,89,0.5)' : 'rgba(255,255,255,0.12)'}`,
          color: enabled ? '#34C759' : 'rgba(255,255,255,0.5)',
        }}
      >
        <Hand className="h-4 w-4" />
      </button>
    </div>
  )
}
