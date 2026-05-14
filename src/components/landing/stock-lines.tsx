'use client'

import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'

interface StockLine {
  points: number[]
  color: string
  glowColor: string
  lineWidth: number
  opacity: number
  speed: number        // px per frame
  offset: number       // current horizontal scroll
  yBase: number        // vertical center on screen (0–1 of height)
  yScale: number       // amplitude
}

// Seeded pseudo-random so lines look the same on every render
function seededRng(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

function generatePoints(rng: () => number, count: number, trend: number, volatility: number): number[] {
  const pts: number[] = [0]
  for (let i = 1; i < count; i++) {
    const prev = pts[i - 1]
    // Momentum: price tends to continue in the same direction briefly
    const momentum = i > 1 ? (pts[i - 1] - pts[i - 2]) * 0.4 : 0
    const change = (rng() - 0.5) * volatility + trend + momentum
    pts.push(prev + change)
  }
  // Normalize to [-1, 1] range
  const min = Math.min(...pts)
  const max = Math.max(...pts)
  const range = max - min || 1
  return pts.map(p => ((p - min) / range) * 2 - 1)
}

export default function StockLines() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>()
  const linesRef = useRef<StockLine[]>([])
  const prefersReduced = useReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Match canvas to display size
    function resize() {
      canvas!.width = canvas!.offsetWidth * window.devicePixelRatio
      canvas!.height = canvas!.offsetHeight * window.devicePixelRatio
      ctx!.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)

    const POINT_SPACING = 8   // px between data points
    const POINT_COUNT   = 600 // total points per line (more than viewport)

    // Define lines — each is a separate "stock"
    const configs = [
      // Green uptrend — strong gain
      { seed: 1,  trend:  0.06, vol: 6,  color: '#16a34a', glow: '#22c55e', lw: 2.0, op: 0.75, speed: 0.6, yBase: 0.28, yScale: 90 },
      // Red downtrend — clear loss
      { seed: 2,  trend: -0.05, vol: 7,  color: '#dc2626', glow: '#ef4444', lw: 2.0, op: 0.70, speed: 0.9, yBase: 0.62, yScale: 100 },
      // Green mild uptrend — mid layer
      { seed: 3,  trend:  0.03, vol: 5,  color: '#15803d', glow: '#4ade80', lw: 1.4, op: 0.45, speed: 0.4, yBase: 0.18, yScale: 70 },
      // Red volatile — choppy
      { seed: 4,  trend: -0.02, vol: 9,  color: '#b91c1c', glow: '#f87171', lw: 1.4, op: 0.42, speed: 1.1, yBase: 0.75, yScale: 80 },
      // Green slow — bottom
      { seed: 5,  trend:  0.04, vol: 4,  color: '#166534', glow: '#86efac', lw: 1.1, op: 0.32, speed: 0.3, yBase: 0.88, yScale: 60 },
      // Red top line
      { seed: 6,  trend: -0.03, vol: 8,  color: '#991b1b', glow: '#fca5a5', lw: 1.1, op: 0.34, speed: 0.7, yBase: 0.08, yScale: 65 },
    ]

    linesRef.current = configs.map(c => ({
      points: generatePoints(seededRng(c.seed), POINT_COUNT, c.trend, c.vol),
      color: c.color,
      glowColor: c.glow,
      lineWidth: c.lw,
      opacity: c.op,
      speed: c.speed,
      offset: 0,
      yBase: c.yBase,
      yScale: c.yScale,
    }))

    function draw() {
      const w = canvas!.offsetWidth
      const h = canvas!.offsetHeight
      ctx!.clearRect(0, 0, w, h)

      for (const line of linesRef.current) {
        // Advance scroll
        line.offset += line.speed
        // Wrap when we've scrolled one full point worth
        if (line.offset >= POINT_SPACING) line.offset -= POINT_SPACING

        const startIdx = 0
        const centerY = h * line.yBase

        ctx!.save()
        ctx!.globalAlpha = line.opacity

        // Glow pass — wider, blurred-ish
        ctx!.shadowColor = line.glowColor
        ctx!.shadowBlur = 8
        ctx!.strokeStyle = line.glowColor
        ctx!.lineWidth = line.lineWidth * 3.5
        ctx!.globalAlpha = line.opacity * 0.18
        ctx!.beginPath()
        for (let i = startIdx; i < line.points.length; i++) {
          const x = i * POINT_SPACING - line.offset
          if (x > w + POINT_SPACING) break
          const y = centerY - line.points[i] * line.yScale
          if (i === startIdx) ctx!.moveTo(x, y)
          else ctx!.lineTo(x, y)
        }
        ctx!.stroke()

        // Main line
        ctx!.shadowBlur = 3
        ctx!.strokeStyle = line.color
        ctx!.lineWidth = line.lineWidth
        ctx!.lineJoin = 'round'
        ctx!.lineCap = 'round'
        ctx!.globalAlpha = line.opacity
        ctx!.beginPath()
        for (let i = startIdx; i < line.points.length; i++) {
          const x = i * POINT_SPACING - line.offset
          if (x > w + POINT_SPACING) break
          const y = centerY - line.points[i] * line.yScale
          if (i === startIdx) ctx!.moveTo(x, y)
          else ctx!.lineTo(x, y)
        }
        ctx!.stroke()
        ctx!.restore()
      }
    }

    function loop() {
      draw()
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  if (prefersReduced) return null

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  )
}
