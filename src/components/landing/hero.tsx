'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import ChatDemo from './chat-demo'
import NeonBeams from './neon-beams'

interface HeroProps {
  isAuthenticated: boolean
}

export default function Hero({ isAuthenticated }: HeroProps) {
  const prefersReduced = useReducedMotion()

  return (
    <section
      className="relative flex flex-col overflow-hidden"
      style={{ minHeight: '100svh', background: '#f5f5f8' }}
    >
      {/* ── Background: blurred beams, more vivid ────────────────────── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div style={{ position: 'absolute', inset: 0, filter: 'blur(80px)', transform: 'scale(1.15)' }}>
          <NeonBeams />
        </div>
        {/* Lighter veil — let the color breathe */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(245, 245, 248, 0.30)' }} />
      </div>

      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-6 pt-7 md:px-14">
        <span className="text-xl font-bold" style={{ color: 'var(--color-text)', letterSpacing: '-0.025em' }}>
          Mirror.
        </span>
        {isAuthenticated ? (
          <Link href="/dashboard" className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
            Dashboard
          </Link>
        ) : (
          <Link href="/login" className="text-sm font-medium hover:opacity-80 transition-opacity" style={{ color: 'var(--color-text-muted)' }}>
            Sign in
          </Link>
        )}
      </nav>

      {/* ── Hero — centered with even padding ────────────────────────── */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-center gap-12 md:gap-20 flex-1 px-6 py-20 md:px-14 max-w-6xl mx-auto w-full">

        {/* Left */}
        <motion.div
          className="flex-1 flex flex-col items-start max-w-[420px]"
          initial={prefersReduced ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-6" style={{ color: 'var(--color-text-faint)' }}>
            AI portfolio tracker
          </p>

          <h1
            className="font-bold leading-[1.08] mb-5"
            style={{ fontSize: 'clamp(2.4rem, 5vw, 3.5rem)', color: 'var(--color-text)', letterSpacing: '-0.035em' }}
          >
            See your financial<br />self clearly.
          </h1>

          <p className="text-base mb-10 leading-relaxed" style={{ color: 'var(--color-text-muted)', maxWidth: '320px' }}>
            Upload a trade confirmation.<br />Ask anything about your portfolio.
          </p>

          <div className="flex items-center gap-5">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
                style={{ background: 'var(--color-cta)', color: '#fff' }}
              >
                Go to dashboard →
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
                  style={{ background: 'var(--color-cta)', color: '#fff' }}
                >
                  Start asking →
                </Link>
                <Link href="/login" className="text-sm font-medium hover:opacity-70 transition-opacity" style={{ color: 'var(--color-text-muted)' }}>
                  Sign in
                </Link>
              </>
            )}
          </div>
        </motion.div>

        {/* Right — chat card */}
        <motion.div
          className="flex-1 flex justify-center md:justify-end w-full"
          style={{ maxWidth: 400 }}
          initial={prefersReduced ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.25 }}
        >
          <ChatDemo />
        </motion.div>
      </div>

      {/* ── Subtle bottom tagline ─────────────────────────────────────── */}
      <div className="relative z-10 pb-8 text-center">
        <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
          No spreadsheets. No five tabs. Just answers.
        </p>
      </div>
    </section>
  )
}
