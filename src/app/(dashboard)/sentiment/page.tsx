'use client'

import { useState, useEffect, useRef, CSSProperties } from 'react'
import { SentimentHeader } from '@/components/sentiment/sentiment-header'
import { PriceSentimentChart } from '@/components/sentiment/price-sentiment-chart'
import { PolarizationBar } from '@/components/sentiment/polarization-bar'
import { EvidencePosts } from '@/components/sentiment/evidence-posts'
import { NarrativeSummary } from '@/components/sentiment/narrative-summary'
import type { TickerPrice } from '@/lib/finnhub/client'
import type { DailyCandle } from '@/lib/alpaca/client'

// ─── Types ────────────────────────────────────────────────────────────────────

type PostItem = {
  id: string
  text: string
  author_username: string | null
  permalink: string
  like_count: number
  posted_at: string
  sentiment_label: string
}

interface AnalyzeResponse {
  cached: boolean
  ticker: string
  aggregate: {
    id: string
    ticker: string
    computed_at: string
    sentiment_score: number
    sentiment_label: string
    post_count: number
    positive_count: number
    neutral_count: number
    negative_count: number
    polarization: number
    polarization_label: string
    narrative: string
  }
  posts: PostItem[]
  currentPrice: TickerPrice | null
  historicalPrices: DailyCandle[]
  sentimentHistory: { computed_at: string; sentiment_score: number; post_count: number }[]
}

type State = 'idle' | 'analyzing' | 'results' | 'error'

// ─── Constants ────────────────────────────────────────────────────────────────

const EXAMPLE_TICKERS = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META']

const LOADING_STEPS = [
  { text: 'Fetching news articles...', delay: 0 },
  { text: 'Analyzing sentiment...', delay: 3000 },
  { text: 'Generating narrative...', delay: 8000 },
  { text: 'Almost there...', delay: 15000 },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SentimentPage() {
  const [state, setState] = useState<State>('idle')
  const [inputValue, setInputValue] = useState('')
  const [activeTicker, setActiveTicker] = useState('')
  const [data, setData] = useState<AnalyzeResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [placeholder, setPlaceholder] = useState('')
  const [loadingMsg, setLoadingMsg] = useState(LOADING_STEPS[0].text)
  const [loadingStep, setLoadingStep] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const isIdle = state === 'idle'

  // ── Typewriter placeholder (idle only) ──────────────────────────────────────
  useEffect(() => {
    if (!isIdle) return

    let tickerIdx = 0
    let charIdx = 0
    let deleting = false
    let timeout: ReturnType<typeof setTimeout>

    const tick = () => {
      const current = EXAMPLE_TICKERS[tickerIdx]
      if (!deleting) {
        charIdx++
        setPlaceholder(current.slice(0, charIdx))
        if (charIdx === current.length) {
          deleting = true
          timeout = setTimeout(tick, 1800)
          return
        }
      } else {
        charIdx--
        setPlaceholder(current.slice(0, charIdx))
        if (charIdx === 0) {
          deleting = false
          tickerIdx = (tickerIdx + 1) % EXAMPLE_TICKERS.length
        }
      }
      timeout = setTimeout(tick, deleting ? 70 : 130)
    }

    timeout = setTimeout(tick, 500)
    return () => clearTimeout(timeout)
  }, [isIdle])

  // ── Loading message rotation ─────────────────────────────────────────────────
  useEffect(() => {
    if (state !== 'analyzing') return
    setLoadingMsg(LOADING_STEPS[0].text)
    setLoadingStep(0)
    const timers = LOADING_STEPS.slice(1).map(({ text, delay }, i) =>
      setTimeout(() => {
        setLoadingMsg(text)
        setLoadingStep(i + 1)
      }, delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [state])

  // ── Auto-focus on idle ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isIdle) setTimeout(() => inputRef.current?.focus(), 650)
  }, [isIdle])

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const ticker = inputValue.trim().toUpperCase()
    if (!ticker || !/^[A-Z]{1,5}$/.test(ticker)) return

    setActiveTicker(ticker)
    setState('analyzing')

    try {
      const res = await fetch('/api/sentiment/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Analysis failed')
      setData(json)
      setState('results')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setState('error')
    }
  }

  const handleReset = () => {
    setState('idle')
    setInputValue('')
    setData(null)
    setErrorMsg('')
  }

  // ── Search bar style — animates from center to top-left ──────────────────────
  const barStyle: CSSProperties = {
    position: 'fixed',
    zIndex: 50,
    transition: [
      'top 0.65s cubic-bezier(0.4, 0, 0.2, 1)',
      'left 0.65s cubic-bezier(0.4, 0, 0.2, 1)',
      'width 0.65s cubic-bezier(0.4, 0, 0.2, 1)',
      'transform 0.65s cubic-bezier(0.4, 0, 0.2, 1)',
    ].join(', '),
    ...(isIdle
      ? {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(560px, calc(100vw - 48px))',
        }
      : {
          top: '20px',
          left: '20px',
          transform: 'translate(0, 0)',
          width: '260px',
        }),
  }

  return (
    <>
      {/* Background — gradient in idle, canvas in results */}
      <div
        className="fixed inset-0 transition-all duration-700 pointer-events-none"
        style={{
          zIndex: 0,
          background: isIdle
            ? 'radial-gradient(ellipse at 60% 40%, #1a1a2e 0%, #0d0d0d 60%)'
            : 'transparent',
        }}
      />

      {/* Subtle grid overlay on idle */}
      {isIdle && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            zIndex: 1,
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            opacity: 0.6,
          }}
        />
      )}

      {/* Search bar */}
      <div style={barStyle}>
        {isIdle && (
          <div className="text-center mb-6 animate-fade-in">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-[0.2em] mb-2 select-none">
              News Sentiment
            </p>
            <p className="text-white/80 text-lg font-medium select-none leading-snug">
              What are traders saying<br/>right now?
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div
            className={`flex items-center gap-2 rounded-2xl px-4 transition-all duration-500 ${
              isIdle
                ? 'bg-white/8 border border-white/15 py-4 shadow-2xl'
                : 'bg-white border border-stone-200 py-2.5 shadow-card'
            }`}
            style={isIdle ? { backdropFilter: 'blur(24px)', background: 'rgba(255,255,255,0.08)' } : {}}
          >
            <span
              className={`font-bold select-none transition-all duration-500 ${
                isIdle ? 'text-white/35 text-xl' : 'text-gray-400 text-sm'
              }`}
            >
              $
            </span>

            <input
              ref={inputRef}
              value={inputValue}
              onChange={e =>
                setInputValue(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))
              }
              placeholder={isIdle ? placeholder : activeTicker}
              maxLength={5}
              disabled={state === 'analyzing'}
              autoComplete="off"
              spellCheck={false}
              className={`flex-1 bg-transparent outline-none font-semibold tracking-widest transition-all duration-500 ${
                isIdle
                  ? 'text-white placeholder:text-white/20 text-xl caret-white'
                  : 'text-gray-800 placeholder:text-gray-400 text-sm cursor-default'
              }`}
            />

            {isIdle && (
              <button
                type="submit"
                className="flex-shrink-0 text-xs text-white/35 border border-white/15 rounded-lg px-2.5 py-1.5 hover:text-white/70 hover:border-white/30 hover:bg-white/5 transition-all font-medium"
              >
                enter ↵
              </button>
            )}

            {(state === 'results' || state === 'error') && (
              <button
                type="button"
                onClick={handleReset}
                className="flex-shrink-0 text-xs text-gray-400 hover:text-gray-700 transition-colors w-5 h-5 flex items-center justify-center rounded-md hover:bg-stone-100"
              >
                ✕
              </button>
            )}
          </div>
        </form>

        {/* Example tickers hint */}
        {isIdle && (
          <div className="flex items-center justify-center gap-2 mt-4 animate-fade-in delay-300">
            {EXAMPLE_TICKERS.slice(0, 5).map((t) => (
              <button
                key={t}
                onClick={() => { setInputValue(t); inputRef.current?.focus() }}
                className="text-[10px] text-white/30 hover:text-white/60 transition-colors font-mono tracking-wider px-1.5 py-0.5 rounded hover:bg-white/5"
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Analyzing — loading state */}
      {state === 'analyzing' && (
        <div className="fixed inset-0 flex flex-col items-center justify-center gap-5" style={{ zIndex: 30 }}>
          <div className="flex gap-1.5">
            {[0, 120, 240].map(delay => (
              <span
                key={delay}
                className="h-2 w-2 rounded-full animate-bounce"
                style={{ backgroundColor: 'var(--color-text-faint)', animationDelay: `${delay}ms` }}
              />
            ))}
          </div>

          <div className="text-center">
            <p
              key={loadingMsg}
              className="font-ui italic text-sm animate-fade-in"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {loadingMsg}
            </p>
            <p className="font-data text-[10px] mt-1" style={{ color: 'var(--color-text-faint)' }}>
              Step {loadingStep + 1} of {LOADING_STEPS.length}
            </p>
          </div>

          <div className="w-48 h-0.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border-sub)' }}>
            <div
              className="h-full w-2/5 rounded-full"
              style={{ backgroundColor: 'var(--color-text-muted)', animation: 'slide-indeterminate 1.6s ease-in-out infinite' }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {state === 'error' && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 30 }}>
          <div className="text-center space-y-4 px-6 animate-scale-in">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: 'var(--color-loss-bg)' }}>
              <span className="text-lg" style={{ color: 'var(--color-loss)' }}>⚠</span>
            </div>
            <p className="font-ui text-sm" style={{ color: 'var(--color-text)' }}>{errorMsg}</p>
            <button
              onClick={handleReset}
              className="font-ui text-sm underline underline-offset-2 transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {state === 'results' && data && (
        <div className="pt-20 pb-16 px-6 max-w-4xl mx-auto space-y-5 animate-fade-up">
          <SentimentHeader
            ticker={data.ticker}
            currentPrice={data.currentPrice ?? undefined}
            aggregate={data.aggregate}
          />
          <PriceSentimentChart
            historicalPrices={data.historicalPrices}
            sentimentHistory={data.sentimentHistory}
          />
          <PolarizationBar
            positiveCount={data.aggregate.positive_count}
            neutralCount={data.aggregate.neutral_count}
            negativeCount={data.aggregate.negative_count}
            polarizationLabel={data.aggregate.polarization_label}
          />
          <EvidencePosts posts={data.posts} />
          <NarrativeSummary narrative={data.aggregate.narrative} />
          <p
            className="font-data text-[10px] pt-4"
            style={{ color: 'var(--color-text-faint)', borderTop: '1px solid var(--color-border-sub)' }}
          >
            This page summarizes recent financial news sentiment. It is not investment advice,
            a recommendation, or a prediction. Sentiment data should never be the sole basis
            for investment decisions.
          </p>
        </div>
      )}
    </>
  )
}
