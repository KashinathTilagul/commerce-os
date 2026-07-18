import { useWindowStore } from './window-store'

const WASM_CDN  = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

const WRIST = 0
const THUMB_TIP = 4
const INDEX_TIP = 8, INDEX_PIP = 6
const MIDDLE_TIP = 12, MIDDLE_PIP = 10, MIDDLE_MCP = 9
const RING_TIP = 16, RING_PIP = 14
const PINKY_TIP = 20, PINKY_PIP = 18

export const PINCH_ON  = 0.30  // exported so debug panel can show threshold
export const PINCH_OFF = 0.44

const CLICK_MOVE_TOLERANCE = 30    // px — pinch counts as a tap only if the finger stayed within this radius
const DOUBLE_TAP_WINDOW_MS = 380   // second pinch-tap within this window (and near the first) → right-click
const DOUBLE_TAP_DIST      = 45    // px
const CURSOR_SMOOTHING     = 0.22  // 0=frozen, 1=no smoothing — lower = smoother but more lag
const MOUSEMOVE_MIN_DELTA  = 2     // px — only dispatch hover mousemove when the cursor actually moved
const SCROLL_PIXEL_GAIN    = 2.2   // scroll px per px of vertical finger travel while pinch-holding
const SCROLL_MOVE_THRESHOLD = 8    // px — total vertical travel during a pinch before it counts as "scrolled" (blocks an accidental click after)
const FIST_HOLD_MS         = 500
const FIST_COOLDOWN_MS     = 1200
const ZOOM_MIN = 0.6
const ZOOM_MAX = 1.8
const ZOOM_GAIN = 2.4

type Lm = { x: number; y: number }
function dist(a: Lm, b: Lm) { return Math.hypot(a.x - b.x, a.y - b.y) }

// A finger counts as extended if its tip is farther from the wrist than its
// middle (PIP) joint — cheap and reliable enough for fist/open-palm detection.
function fingerExtended(tip: Lm, pip: Lm, wrist: Lm): boolean {
  return dist(tip, wrist) > dist(pip, wrist) * 1.05
}

// Walks up from `el` looking for a genuinely scrollable ancestor (has
// overflow auto/scroll AND more content than fits) — robust to whatever
// class names each window/panel happens to use.
function findScrollable(el: Element | null): HTMLElement | null {
  let node: HTMLElement | null = el as HTMLElement | null
  while (node && node !== document.body) {
    const style = getComputedStyle(node)
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 2) return node
    node = node.parentElement
  }
  return null
}

export type Pose = 'pinch' | 'fist' | 'open' | 'point' | 'none'

export const POSE_EMOJI: Record<Pose, string> = {
  pinch: '🤏', fist: '✊', open: '✋', point: '👆', none: '🖐️',
}

export type FrameDebug = {
  landmarks: Lm[]
  ratio: number
  pinching: boolean
  handDetected: boolean
  pose: Pose
}

export type TrackerStatus = 'requesting-camera' | 'loading-model' | 'ready' | 'error'

// Full mouse/trackpad replacement via one hand:
//  - index fingertip moves a smoothed cursor (shown as a hand emoji matching
//    the detected pose, so you can see exactly what's being recognized)
//  - pinch tap = left click; pinch + drag = left-drag; two pinch taps close
//    together = right click
//  - pinch, hold, and move vertically over scrollable content = scroll
//  - fist held = close the active window
//  - two hands both pinching, moving apart/together = zoom the desktop
export class OSGestureController {
  private video: HTMLVideoElement
  private cursorEl: HTMLDivElement | null
  private onFrame: ((d: FrameDebug) => void) | undefined
  private onStatus: ((s: TrackerStatus, detail?: string) => void) | undefined
  private onBackgroundPinch: (() => void) | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private landmarker: any = null
  private stream: MediaStream | null = null
  private rafId = 0
  private running = false
  private lastVideoTime = -1

  private pinching = false
  private dragging = false
  private dragTarget: Element | null = null
  private pinchStartX = 0
  private pinchStartY = 0
  private pinchLastY = 0
  private scrollTarget: HTMLElement | null = null
  private scrolledDistance = 0

  private pendingTapTimer: ReturnType<typeof setTimeout> | null = null
  private pendingTapAt = 0
  private pendingTapX = 0
  private pendingTapY = 0
  private pendingTapTarget: Element | null = null

  private fistSince = 0
  private lastFistActionAt = 0

  private lastCursorX = 0
  private lastCursorY = 0
  private lastPinchDist: number | null = null

  private smoothX = 0
  private smoothY = 0
  private smoothInit = false

  constructor(
    video: HTMLVideoElement,
    cursorEl: HTMLDivElement | null,
    onFrame?: (d: FrameDebug) => void,
    onStatus?: (s: TrackerStatus, detail?: string) => void,
    onBackgroundPinch?: () => void,
  ) {
    this.video    = video
    this.cursorEl = cursorEl
    this.onFrame  = onFrame
    this.onStatus = onStatus
    this.onBackgroundPinch = onBackgroundPinch
  }

  async start(): Promise<void> {
    try {
      this.onStatus?.('requesting-camera')
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: false,
      })
      this.video.srcObject = this.stream
      await this.video.play()

      this.onStatus?.('loading-model')
      const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision')
      const fileset = await FilesetResolver.forVisionTasks(WASM_CDN)
      const opts = {
        baseOptions:                { modelAssetPath: MODEL_URL, delegate: 'GPU' as const },
        runningMode:                'VIDEO' as const,
        numHands:                   2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence:  0.5,
        minTrackingConfidence:      0.5,
      }
      try {
        this.landmarker = await HandLandmarker.createFromOptions(fileset, opts)
      } catch {
        this.landmarker = await HandLandmarker.createFromOptions(fileset, {
          ...opts, baseOptions: { ...opts.baseOptions, delegate: 'CPU' as const },
        })
      }

      this.running = true
      this.onStatus?.('ready')
      this.loop()
    } catch (e) {
      const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
      console.warn('[OSGestureController] Could not start:', e)
      this.onStatus?.('error', msg)
    }
  }

  stop(): void {
    this.running = false
    cancelAnimationFrame(this.rafId)
    this.landmarker?.close()
    this.landmarker = null
    this.stream?.getTracks().forEach(t => t.stop())
    this.stream = null
    this.video.srcObject = null
    if (this.pendingTapTimer) clearTimeout(this.pendingTapTimer)
    this.pendingTapTimer = null
    if (this.cursorEl) this.cursorEl.style.opacity = '0'
    this.smoothInit = false
    document.documentElement.style.setProperty('--gesture-zoom', '1')
  }

  private loop = () => {
    if (!this.running) return
    this.rafId = requestAnimationFrame(this.loop)
    if (!this.landmarker || this.video.readyState < 2) return
    if (this.video.currentTime === this.lastVideoTime) return
    this.lastVideoTime = this.video.currentTime

    const now = performance.now()
    const result = this.landmarker.detectForVideo(this.video, now)
    const hands: Lm[][] = result.landmarks || []

    if (!hands.length) {
      this.pinching = false
      this.dragging = false
      this.scrollTarget = null
      this.fistSince = 0
      this.smoothInit = false
      this.lastPinchDist = null
      if (this.cursorEl) this.cursorEl.style.opacity = '0'
      this.onFrame?.({ landmarks: [], ratio: 1, pinching: false, handDetected: false, pose: 'none' })
      return
    }

    // Two hands both pinching → zoom via a CSS custom property the desktop
    // root reads as `transform: scale(var(--gesture-zoom, 1))`.
    if (hands.length === 2) {
      const [h0, h1] = hands
      const r0 = dist(h0[THUMB_TIP], h0[INDEX_TIP]) / dist(h0[WRIST], h0[MIDDLE_MCP])
      const r1 = dist(h1[THUMB_TIP], h1[INDEX_TIP]) / dist(h1[WRIST], h1[MIDDLE_MCP])
      if (r0 < PINCH_ON && r1 < PINCH_ON) {
        const d = dist(h0[INDEX_TIP], h1[INDEX_TIP])
        if (this.lastPinchDist != null) {
          const delta = d - this.lastPinchDist
          const cur = parseFloat(document.documentElement.style.getPropertyValue('--gesture-zoom') || '1')
          const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, cur + delta * ZOOM_GAIN))
          document.documentElement.style.setProperty('--gesture-zoom', next.toFixed(3))
        }
        this.lastPinchDist = d
        if (this.cursorEl) this.cursorEl.style.opacity = '0'
        return
      }
    }
    this.lastPinchDist = null

    const lm = hands[0]
    const wrist = lm[WRIST]
    const handSize = dist(wrist, lm[MIDDLE_MCP])
    if (handSize < 1e-6) return

    const ratio       = dist(lm[THUMB_TIP], lm[INDEX_TIP]) / handSize
    const pinchThresh = this.pinching ? PINCH_OFF : PINCH_ON
    const wasPinching = this.pinching
    this.pinching = ratio < pinchThresh

    const idxExt   = fingerExtended(lm[INDEX_TIP], lm[INDEX_PIP], wrist)
    const midExt   = fingerExtended(lm[MIDDLE_TIP], lm[MIDDLE_PIP], wrist)
    const ringExt  = fingerExtended(lm[RING_TIP], lm[RING_PIP], wrist)
    const pinkyExt = fingerExtended(lm[PINKY_TIP], lm[PINKY_PIP], wrist)
    const extCount = [idxExt, midExt, ringExt, pinkyExt].filter(Boolean).length
    const isFist   = extCount === 0 && !this.pinching
    const isOpen   = extCount >= 3 && !this.pinching

    let pose: Pose = 'none'
    if (this.pinching) pose = 'pinch'
    else if (isFist) pose = 'fist'
    else if (isOpen) pose = 'open'
    else if (idxExt) pose = 'point'

    // Cursor: raw index fingertip, mirrored, then exponentially smoothed.
    const rawX = (1 - lm[INDEX_TIP].x) * window.innerWidth
    const rawY = lm[INDEX_TIP].y * window.innerHeight
    if (!this.smoothInit) { this.smoothX = rawX; this.smoothY = rawY; this.smoothInit = true }
    else {
      this.smoothX += (rawX - this.smoothX) * CURSOR_SMOOTHING
      this.smoothY += (rawY - this.smoothY) * CURSOR_SMOOTHING
    }
    const cx = this.smoothX, cy = this.smoothY

    // Cursor visual = hand emoji matching the detected pose, so it's obvious
    // what's being recognized and how it maps to your real hand.
    if (this.cursorEl) {
      this.cursorEl.style.opacity = '1'
      this.cursorEl.style.transform = `translate(${cx}px, ${cy}px)`
      this.cursorEl.textContent = POSE_EMOJI[pose]
    }

    // ── Pinch: left click / drag / scroll ──────────────────────────────
    if (this.pinching && !wasPinching) {
      this.pinchStartX = cx
      this.pinchStartY = cy
      this.pinchLastY  = cy
      this.scrolledDistance = 0
      this.dragTarget = document.elementFromPoint(cx, cy)
      this.scrollTarget = this.dragTarget?.closest('[data-desktop-bg]') ? null : findScrollable(this.dragTarget)
      if (!this.dragTarget?.closest('[data-desktop-bg]')) {
        this.dragTarget?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: cx, clientY: cy, button: 0 }))
      }
    } else if (this.pinching && wasPinching) {
      if (this.scrollTarget) {
        // Pinch-hold-and-wave: scroll the container under the pinch, driven
        // directly by the fingertip's vertical travel.
        const dyPix = cy - this.pinchLastY
        this.scrollTarget.scrollTop += dyPix * SCROLL_PIXEL_GAIN
        this.scrolledDistance += Math.abs(dyPix)
        this.pinchLastY = cy
      } else {
        const moved = dist({ x: cx, y: cy }, { x: this.pinchStartX, y: this.pinchStartY })
        if (moved > CLICK_MOVE_TOLERANCE) {
          this.dragging = true
          document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX: cx, clientY: cy }))
        }
      }
    } else if (!this.pinching && wasPinching) {
      // Pinch released
      const movedFromStart = dist({ x: cx, y: cy }, { x: this.pinchStartX, y: this.pinchStartY })
      const wasScroll = this.scrolledDistance > SCROLL_MOVE_THRESHOLD

      if (this.dragging) {
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: cx, clientY: cy }))
      } else if (!wasScroll && movedFromStart <= CLICK_MOVE_TOLERANCE) {
        if (this.dragTarget?.closest('[data-desktop-bg]')) {
          this.onBackgroundPinch?.()
        } else {
          this.dragTarget?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: cx, clientY: cy }))
          this.registerTap(cx, cy, this.dragTarget)
        }
      } else if (this.dragTarget) {
        // Was over scrollable content but genuinely scrolled — still pair the mousedown
        this.dragTarget.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: cx, clientY: cy }))
      }

      this.dragging = false
      this.dragTarget = null
      this.scrollTarget = null
    }

    // ── Fist held → close active window ──────────────────────────────
    if (isFist) {
      if (this.fistSince === 0) this.fistSince = now
      else if (now - this.fistSince > FIST_HOLD_MS && now - this.lastFistActionAt > FIST_COOLDOWN_MS) {
        this.lastFistActionAt = now
        this.fistSince = 0
        const { activeId, close } = useWindowStore.getState()
        if (activeId) close(activeId)
      }
    } else {
      this.fistSince = 0
    }

    // ── Hover mousemove — lets JS-driven hover states react to the cursor ──
    if (!this.pinching && dist({ x: cx, y: cy }, { x: this.lastCursorX, y: this.lastCursorY }) > MOUSEMOVE_MIN_DELTA) {
      const el = document.elementFromPoint(cx, cy)
      el?.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX: cx, clientY: cy }))
    }
    this.lastCursorX = cx
    this.lastCursorY = cy

    this.onFrame?.({ landmarks: lm, ratio, pinching: this.pinching, handDetected: true, pose })
  }

  // Two pinch-taps close together in time and space → right click instead
  // of two left clicks. The first tap's click is deferred until the window
  // closes with no second tap.
  private registerTap(x: number, y: number, target: Element | null) {
    if (this.pendingTapTimer) {
      const dt = performance.now() - this.pendingTapAt
      const d  = dist({ x, y }, { x: this.pendingTapX, y: this.pendingTapY })
      if (dt < DOUBLE_TAP_WINDOW_MS && d < DOUBLE_TAP_DIST) {
        clearTimeout(this.pendingTapTimer)
        this.pendingTapTimer = null
        target?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: x, clientY: y }))
        return
      }
      clearTimeout(this.pendingTapTimer)
    }
    this.pendingTapAt = performance.now()
    this.pendingTapX = x
    this.pendingTapY = y
    this.pendingTapTarget = target
    this.pendingTapTimer = setTimeout(() => {
      this.pendingTapTimer = null
      const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y }
      this.pendingTapTarget?.dispatchEvent(new MouseEvent('click', opts))
    }, DOUBLE_TAP_WINDOW_MS)
  }
}
