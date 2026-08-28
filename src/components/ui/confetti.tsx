'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// ExamForge brand colors
// ---------------------------------------------------------------------------
const CONFETTI_COLORS = [
  '#6366f1', // indigo-500
  '#8b5cf6', // violet-500
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#ec4899', // pink-500
  '#3b82f6', // blue-500
]

// ---------------------------------------------------------------------------
// Particle shape
// ---------------------------------------------------------------------------
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
  rotation: number
  rotationSpeed: number
  shape: 'rect' | 'circle'
  opacity: number
}

// ---------------------------------------------------------------------------
// Canvas confetti renderer — auto-cleanup after 3 s
// ---------------------------------------------------------------------------
class ConfettiEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private particles: Particle[] = []
  private animFrame = 0
  private startTime = 0
  private readonly duration = 3000 // auto-cleanup after 3 s
  private onComplete?: () => void

  constructor(canvas: HTMLCanvasElement, onComplete?: () => void) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.onComplete = onComplete
  }

  launch(particleCount = 150): void {
    const { width, height } = this.canvas
    this.particles = []
    this.startTime = performance.now()

    for (let i = 0; i < particleCount; i++) {
      // Emit from bottom-center with upward spread
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8
      const speed = 8 + Math.random() * 14

      this.particles.push({
        x: width * 0.5 + (Math.random() - 0.5) * width * 0.4,
        y: height * 0.65,
        vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
        vy: Math.sin(angle) * speed - 3,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: 4 + Math.random() * 7,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 14,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
        opacity: 1,
      })
    }

    this.tick()
  }

  private tick = (): void => {
    const elapsed = performance.now() - this.startTime
    if (elapsed > this.duration) {
      this.cancel()
      this.onComplete?.()
      return
    }

    // Fade-out over the last second
    const fadeOut = elapsed > this.duration - 1000
      ? Math.max(0, (this.duration - elapsed) / 1000)
      : 1

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    for (const p of this.particles) {
      // Physics
      p.vy += 0.28 // gravity
      p.vx *= 0.99 // air resistance
      p.x += p.vx
      p.y += p.vy
      p.rotation += p.rotationSpeed
      p.opacity = fadeOut

      // Draw
      this.ctx.save()
      this.ctx.translate(p.x, p.y)
      this.ctx.rotate((p.rotation * Math.PI) / 180)
      this.ctx.globalAlpha = p.opacity
      this.ctx.fillStyle = p.color

      if (p.shape === 'rect') {
        this.ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
      } else {
        this.ctx.beginPath()
        this.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
        this.ctx.fill()
      }

      this.ctx.restore()
    }

    this.animFrame = requestAnimationFrame(this.tick)
  }

  cancel(): void {
    cancelAnimationFrame(this.animFrame)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }
}

// ---------------------------------------------------------------------------
// Reduced-motion helper
// ---------------------------------------------------------------------------
const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ---------------------------------------------------------------------------
// useConfetti hook
// ---------------------------------------------------------------------------
interface UseConfettiOptions {
  /** Number of particles (default 150) */
  particleCount?: number
  /** Called when animation finishes */
  onComplete?: () => void
}

export function useConfetti(opts: UseConfettiOptions = {}) {
  const [active, setActive] = useState(false)
  const engineRef = useRef<ConfettiEngine | null>(null)

  const trigger = useCallback(() => {
    // Respect reduced motion — silently skip
    if (prefersReducedMotion()) return
    setActive(true)
  }, [])

  // Mount a fullscreen canvas portal and run the engine
  useEffect(() => {
    if (!active) return

    const canvas = document.createElement('canvas')
    canvas.style.position = 'fixed'
    canvas.style.inset = '0'
    canvas.style.width = '100vw'
    canvas.style.height = '100vh'
    canvas.style.pointerEvents = 'none'
    canvas.style.zIndex = '9999'
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    document.body.appendChild(canvas)

    const engine = new ConfettiEngine(canvas, () => {
      setActive(false)
      opts.onComplete?.()
    })
    engineRef.current = engine
    engine.launch(opts.particleCount)

    return () => {
      engine.cancel()
      canvas.remove()
      engineRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  return { trigger, active }
}

// ---------------------------------------------------------------------------
// Declarative <Confetti /> component
// ---------------------------------------------------------------------------
interface ConfettiProps {
  /** Fire when true */
  active: boolean
  /** Number of particles */
  particleCount?: number
  /** Called when animation finishes */
  onComplete?: () => void
}

export function Confetti({ active, particleCount = 150, onComplete }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const engineRef = useRef<ConfettiEngine | null>(null)

  useEffect(() => {
    if (!active) return

    // Respect reduced motion
    if (prefersReducedMotion()) {
      onComplete?.()
      return
    }

    const canvas = document.createElement('canvas')
    canvas.style.position = 'fixed'
    canvas.style.inset = '0'
    canvas.style.width = '100vw'
    canvas.style.height = '100vh'
    canvas.style.pointerEvents = 'none'
    canvas.style.zIndex = '9999'
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    document.body.appendChild(canvas)
    canvasRef.current = canvas

    const engine = new ConfettiEngine(canvas, () => {
      onComplete?.()
    })
    engineRef.current = engine
    engine.launch(particleCount)

    return () => {
      engine.cancel()
      canvas.remove()
    }
  }, [active, particleCount, onComplete])

  return null
}
