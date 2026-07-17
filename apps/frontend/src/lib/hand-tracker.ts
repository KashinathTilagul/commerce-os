import {
  FilesetResolver,
  HandLandmarker,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision'

const WASM_CDN  = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

const THUMB_TIP  = 4
const INDEX_TIP  = 8
const WRIST      = 0
const MIDDLE_MCP = 9

// Hysteresis thresholds — relative to hand size so distance from camera doesn't matter
const PINCH_ON  = 0.30
const PINCH_OFF = 0.44

// Minimum ms between successive pinch triggers (prevents double-fire)
const DEBOUNCE_MS = 900

function dist(a: NormalizedLandmark, b: NormalizedLandmark) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export class KrishnaPinchTracker {
  private video: HTMLVideoElement
  private onPinch: () => void
  private landmarker: HandLandmarker | null = null
  private stream: MediaStream | null = null
  private rafId = 0
  private running = false
  private lastVideoTime = -1
  private pinching = false
  private nextAllowed = 0

  private onReady: (() => void) | undefined

  constructor(video: HTMLVideoElement, onPinch: () => void, onReady?: () => void) {
    this.video   = video
    this.onPinch = onPinch
    this.onReady = onReady
  }

  async start(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: false,
      })
      this.video.srcObject = this.stream
      await this.video.play()

      const fileset = await FilesetResolver.forVisionTasks(WASM_CDN)
      const opts = {
        baseOptions:                { modelAssetPath: MODEL_URL, delegate: 'GPU' as const },
        runningMode:                'VIDEO' as const,
        numHands:                   1,
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence:  0.6,
        minTrackingConfidence:      0.6,
      }
      try {
        this.landmarker = await HandLandmarker.createFromOptions(fileset, opts)
      } catch {
        // Some GPUs reject the WebGL delegate — fall back to CPU
        this.landmarker = await HandLandmarker.createFromOptions(fileset, {
          ...opts, baseOptions: { ...opts.baseOptions, delegate: 'CPU' as const },
        })
      }

      this.running = true
      this.onReady?.()
      this.loop()
    } catch (e) {
      console.warn('[KrishnaPinchTracker] Could not start (camera denied or MediaPipe unavailable):', e)
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

    const result = this.landmarker.detectForVideo(this.video, performance.now())
    if (!result.landmarks.length) { this.pinching = false; return }

    const lm       = result.landmarks[0]
    const handSize  = dist(lm[WRIST], lm[MIDDLE_MCP])
    if (handSize < 1e-6) return

    const ratio     = dist(lm[THUMB_TIP], lm[INDEX_TIP]) / handSize
    const threshold = this.pinching ? PINCH_OFF : PINCH_ON
    const now       = performance.now()

    if (ratio < threshold && !this.pinching && now >= this.nextAllowed) {
      this.pinching    = true
      this.nextAllowed = now + DEBOUNCE_MS
      this.onPinch()
    } else if (ratio >= threshold) {
      this.pinching = false
    }
  }
}
