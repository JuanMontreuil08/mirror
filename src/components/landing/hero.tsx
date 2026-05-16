'use client'

import Link from 'next/link'
import { motion, useReducedMotion, useMotionValue, useSpring, useTransform, type TargetAndTransition } from 'framer-motion'
import ChatDemo from './chat-demo'
import NeonBeams from './neon-beams'

interface HeroProps {
  isAuthenticated: boolean
}

// Emil: punchy ease-out — built-in 'easeOut' lacks punch at the start
const EASE = [0.23, 1, 0.32, 1] as const

export default function Hero({ isAuthenticated }: HeroProps) {
  const prefersReduced = useReducedMotion()

  // Mirror metaphor: the reflection shifts as you look at it.
  // useSpring adds momentum so the card doesn't snap — it drifts like a real mirror.
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const rotateY = useSpring(useTransform(mouseX, [-1, 1], [-5, 5]), { stiffness: 50, damping: 30 })
  const rotateX = useSpring(useTransform(mouseY, [-1, 1], [3, -3]), { stiffness: 50, damping: 30 })

  function handleMouseMove(e: React.MouseEvent<HTMLElement>) {
    if (prefersReduced) return
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set((e.clientX - rect.left) / rect.width * 2 - 1)
    mouseY.set((e.clientY - rect.top) / rect.height * 2 - 1)
  }

  function handleMouseLeave() {
    mouseX.set(0)
    mouseY.set(0)
  }

  // Stagger helper — each text block has its own entrance so they cascade in
  const fadeUp = (delay: number) => ({
    initial: (prefersReduced ? false : { opacity: 0, y: 20 }) as boolean | TargetAndTransition,
    animate: { opacity: 1, y: 0 } as TargetAndTransition,
    transition: { duration: 0.65, ease: EASE, delay },
  })

  return (
    <section
      className="relative flex flex-col overflow-hidden"
      style={{ minHeight: '100svh', background: '#f5f5f8' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── Background: iridescent mirror beams ──────────────────────────── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div style={{ position: 'absolute', inset: 0, filter: 'blur(80px)', transform: 'scale(1.15)' }}>
          <NeonBeams />
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(245, 245, 248, 0.30)' }} />
      </div>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-6 pt-7 md:px-14">
        <span className="text-xl font-bold" style={{ color: 'var(--color-text)', letterSpacing: '-0.025em' }}>
          Mirror.
        </span>
        {isAuthenticated ? (
          <Link href="/dashboard" className="nav-link text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
            Dashboard
          </Link>
        ) : (
          <Link href="/login" className="nav-link text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
            Sign in
          </Link>
        )}
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-center gap-12 md:gap-20 flex-1 px-6 py-20 md:px-14 max-w-6xl mx-auto w-full">

        {/* Left — staggered cascade: eyebrow → h1 → subtitle → CTA */}
        <div className="flex-1 flex flex-col items-start max-w-[420px]">
          <motion.p
            className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-6"
            style={{ color: 'var(--color-text-faint)' }}
            {...fadeUp(0.05)}
          >
            AI portfolio tracker
          </motion.p>

          <motion.h1
            className="font-bold leading-[1.08] mb-5"
            style={{ fontSize: 'clamp(2.4rem, 5vw, 3.5rem)', color: 'var(--color-text)', letterSpacing: '-0.035em' }}
            {...fadeUp(0.13)}
          >
            See your financial<br />self clearly.
          </motion.h1>

          <motion.p
            className="text-base mb-10 leading-relaxed"
            style={{ color: 'var(--color-text-muted)', maxWidth: '320px' }}
            {...fadeUp(0.21)}
          >
            Upload a trade confirmation.<br />Ask anything about your portfolio.
          </motion.p>

          <motion.div className="flex items-center gap-5" {...fadeUp(0.29)}>
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="btn-primary inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold"
                style={{ background: 'var(--color-cta)', color: '#fff' }}
              >
                Go to dashboard →
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="btn-primary inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold"
                  style={{ background: 'var(--color-cta)', color: '#fff' }}
                >
                  Start asking →
                </Link>
                <Link
                  href="/login"
                  className="nav-link text-sm font-medium"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Sign in
                </Link>
              </>
            )}
          </motion.div>
        </div>

        {/* Right — chat card with mirror parallax.
            perspective on this wrapper so the child's rotateX/Y uses it as the 3D context. */}
        <motion.div
          className="flex-1 flex justify-center md:justify-end w-full"
          style={{ maxWidth: 400, perspective: '900px' }}
          initial={(prefersReduced ? false : { opacity: 0, y: 24 }) as boolean | TargetAndTransition}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: EASE, delay: 0.35 }}
        >
          <ChatDemo rotateX={rotateX} rotateY={rotateY} />
        </motion.div>
      </div>

      {/* ── Subtle bottom tagline ─────────────────────────────────────────── */}
      <div className="relative z-10 pb-8 text-center">
        <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
          No spreadsheets. No five tabs. Just answers.
        </p>
      </div>
    </section>
  )
}
