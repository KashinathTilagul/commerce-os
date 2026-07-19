import { useWindowStore } from './window-store'

const WASM_CDN  = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

const WRIST = 0
const THUMB_TIP = 4
const INDEX_TIP = 8, INDEX_MCP = 5
const MIDDLE_TIP = 12, MIDDLE_PIP = 10, MIDDLE_MCP = 9
const RING_TIP = 16, RING_PIP = 14
const PINKY_TIP = 20, PINKY_PIP = 18

export const PINCH_ON  = 0.30  // exported so debug panel can show threshold
export const PINCH_OFF = 0.44

const SCROLL_PIXEL_GAIN    = 3.0   // scroll sensitivity
const SCROLL_MOVE_THRESHOLD = 20    // px — must scroll this much before Krishna activation is blocked
const FIST_HOLD_MS         = 600
const FIST_COOLDOWN_MS     = 1500

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

export class OSGestureController {
  private video: HTMLVideoElement
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
  private pinchLastY = 0
  private scrollTarget: HTMLElement | null = null
  private scrolledDistance = 0
  private wasOnDesktop = false

  private fistSince = 0
  private lastFistActionAt = 0

  constructor(
    video: HTMLVideoElement,
    onFrame?: (d: FrameDebug) => void,
    onStatus?: (s: TrackerStatus, detail?: string) => void,
    onBackgroundPinch?: () => void,
  ) {
    this.video    = video
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
        numHands:                   1,
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
      this.scrollTarget = null
      this.fistSince = 0
      this.onFrame?.({ landmarks: [], ratio: 1, pinching: false, handDetected: false, pose: 'none' })
      return
    }

    const lm = hands[0]
    const wrist = lm[WRIST]
    const handSize = dist(wrist, lm[MIDDLE_MCP])
    if (handSize < 1e-6) return

    const ratio       = dist(lm[THUMB_TIP], lm[INDEX_TIP]) / handSize
    const pinchThresh = this.pinching ? PINCH_OFF : PINCH_ON
    const wasPinching = this.pinching
    this.pinching = ratio < pinchThresh

    const idxExt   = fingerExtended(lm[INDEX_TIP], lm[INDEX_MCP], wrist)
    const midExt   = fingerExtended(lm[MIDDLE_TIP], lm[MIDDLE_PIP], wrist)
    const ringExt  = fingerExtended(lm[RING_TIP], lm[RING_PIP], wrist)
    const pinkyExt = fingerExtended(lm[PINKY_TIP], lm[PINKY_PIP], wrist)
    const extCount = [idxExt, midExt, ringExt, pinkyExt].filter(Boolean).length
    const isFist   = extCount === 0 && !this.pinching

    let pose: Pose = 'none'
    if (this.pinching) pose = 'pinch'
    else if (isFist) pose = 'fist'

    // ── Pinch: scroll only ──────────────────────────────────────────────────
    const fingerY = lm[INDEX_TIP].y * window.innerHeight
    const el = document.elementFromPoint(window.innerWidth / 2, fingerY)
    const onDesktop = !el || !!el?.closest('[data-desktop-bg]')

    if (this.pinching && !wasPinching) {
      this.pinchLastY   = fingerY
      this.scrolledDistance = 0
      this.wasOnDesktop = onDesktop
      if (!onDesktop) this.scrollTarget = findScrollable(el)
    } else if (this.pinching && wasPinching) {
      if (this.scrollTarget) {
        const dyPix = fingerY - this.pinchLastY
        this.scrollTarget.scrollTop += dyPix * SCROLL_PIXEL_GAIN
        this.scrolledDistance += Math.abs(dyPix)
        this.pinchLastY = fingerY
      }
    } else if (!this.pinching && wasPinching) {
      if (this.wasOnDesktop && this.scrolledDistance < SCROLL_MOVE_THRESHOLD) {
        this.onBackgroundPinch?.()
      }
      this.scrollTarget = null
    }

    // ── Fist held → close active window ────────────────────────────────────────
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

    this.onFrame?.({ landmarks: lm, ratio, pinching: this.pinching, handDetected: true, pose })
  }
}
