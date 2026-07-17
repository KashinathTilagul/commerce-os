'use client'
import { useEffect, useRef } from 'react'

type KrishnaState = 'idle' | 'listening' | 'thinking' | 'talking'

const COLORS: Record<KrishnaState, number> = {
  idle:      0x5856D6,
  listening: 0xFF3B30,
  thinking:  0x0A84FF,
  talking:   0x34C759,
}

export function KrishnaOrb({ state }: { state: KrishnaState }) {
  const mountRef = useRef<HTMLDivElement>(null)
  // stateRef lets the animation loop read latest state without recreating the scene
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])

  useEffect(() => {
    const el = mountRef.current
    if (!el || typeof window === 'undefined') return
    let disposed = false
    let rafId = 0

    ;(async () => {
      const THREE = await import('three')
      if (disposed) return

      const W = el.clientWidth  || 80
      const H = el.clientHeight || 80

      const scene  = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
      camera.position.z = 3.2

      // alpha:true keeps the canvas background transparent — no EffectComposer
      // so the button's boxShadow glow shows through correctly
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setSize(W, H)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setClearColor(0x000000, 0)
      el.appendChild(renderer.domElement)

      // Wireframe line material — additive blending for the holographic look
      const lm = (opacity: number) => new THREE.LineBasicMaterial({
        color: COLORS.idle, transparent: true, opacity,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
      const matOuter = lm(0.55)
      const matMid   = lm(0.75)
      const matInner = lm(0.95)
      const scanMat  = new THREE.MeshBasicMaterial({ color: COLORS.idle, transparent: true, opacity: 0.7 })
      const coreMat  = new THREE.MeshBasicMaterial({ color: COLORS.idle, transparent: true, opacity: 1.0 })

      // Three nested wireframe icosahedron shells — different sizes + rotation axes
      const shell1 = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.0, 1)), matOuter)
      const shell2 = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(0.72, 2)), matMid)
      const shell3 = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(0.48, 1)), matInner)
      // Bright core sphere
      const core     = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), coreMat)
      // Scan ring that sweeps up and down like the Ultron HUD
      const scanRing = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.008, 4, 64), scanMat)
      scanRing.rotation.x = Math.PI / 2

      scene.add(shell1, shell2, shell3, core, scanRing)

      function animate() {
        if (disposed) return
        rafId = requestAnimationFrame(animate)

        const s   = stateRef.current
        const col = new THREE.Color(COLORS[s])
        const t   = performance.now() / 1000

        // Propagate state color to all materials each frame
        matOuter.color.copy(col)
        matMid.color.copy(col)
        matInner.color.copy(col)
        scanMat.color.copy(col)
        coreMat.color.copy(col)

        // Rotation speed scales with urgency of state
        const spd = s === 'idle' ? 0.004 : s === 'listening' ? 0.015 : s === 'thinking' ? 0.024 : 0.009
        shell1.rotation.y += spd;       shell1.rotation.x += spd * 0.37
        shell2.rotation.y -= spd * 1.4; shell2.rotation.z += spd * 0.6
        shell3.rotation.y += spd * 0.8; shell3.rotation.x -= spd * 0.45

        // Scan ring sweeps vertically, radius shrinks at poles to stay on sphere surface
        const freq = s === 'idle' ? 0.5 : 1.8
        scanRing.position.y = Math.sin(t * freq) * 0.8
        const ss = Math.sqrt(Math.max(0, 1 - (scanRing.position.y / 0.88) ** 2))
        scanRing.scale.set(ss, ss, 1)
        scanMat.opacity = 0.7 * ss

        // Core breathes: fast pulse when talking, gentle when idle
        core.scale.setScalar(
          s === 'talking'   ? 1 + Math.sin(t * 8)   * 0.26
          : s === 'listening' ? 1 + Math.sin(t * 5) * 0.13
          : s === 'thinking'  ? 1 + Math.sin(t * 12) * 0.08
          :                     1 + Math.sin(t * 1.5) * 0.04
        )

        renderer.render(scene, camera)
      }

      animate()
    })()

    return () => {
      disposed = true
      cancelAnimationFrame(rafId)
      // Renderer/composer/geometry disposal happens via the renderer's domElement removal
    }
  }, []) // runs once — stateRef updates keep it live without recreation

  return <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />
}
