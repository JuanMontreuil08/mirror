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
  evidencePosts: {
    id: string
    tweet_id: string
    text: string
    author_username: string | null
    author_name: string | null
    permalink: string
    like_count: number
    reply_count: number
    retweet_count: number
    posted_at: string
    sentiment_label: string
  }[]
  currentPrice: TickerPrice | null
  historicalPrices: DailyCandle[]
  sentimentHistory: { computed_at: string; sentiment_score: number; post_count: number }[]
}

type State = 'idle' | 'analyzing' | 'results' | 'error'

// ─── Constants ────────────────────────────────────────────────────────────────

const EXAMPLE_TICKERS = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META']

const LOADING_STEPS = [
  { text: 'Fetching X posts...', delay: 0 },
  { text: 'Scoring sentiment with FinBERT...', delay: 5000 },
  { text: 'Generating narrative...', delay: 22000 },
  { text: 'Almost there...', delay: 38000 },
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
    const timers = LOADING_STEPS.slice(1).map(({ text, delay }) =>
      setTimeout(() => setLoadingMsg(text), delay)
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
      {/* Dark overlay — only visible in idle state */}
      <div
        className="fixed inset-0 transition-opacity duration-500 pointer-events-none"
        style={{
          zIndex: 40,
          opacity: isIdle ? 1 : 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Search bar */}
      <div style={barStyle}>
        {isIdle && (
          <p className="text-center text-white/60 text-sm font-medium mb-5 tracking-wide select-none">
            X Sentiment — what traders are saying right now
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div
            className={`flex items-center gap-2 rounded-xl px-4 transition-all duration-500 ${
              isIdle
                ? 'bg-white/10 border border-white/20 py-4 shadow-2xl'
                : 'bg-white border border-gray-200 py-2.5 shadow-md'
            }`}
            style={isIdle ? { backdropFilter: 'blur(20px)' } : {}}
          >
            <span
              className={`font-bold select-none transition-all duration-500 ${
                isIdle ? 'text-white/40 text-xl' : 'text-gray-400 text-sm'
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
                  ? 'text-white placeholder:text-white/25 text-xl caret-white'
                  : 'text-gray-800 placeholder:text-gray-400 text-sm cursor-default'
              }`}
            />

            {isIdle && (
              <button
                type="submit"
                className="flex-shrink-0 text-xs text-white/40 border border-white/20 rounded-md px-2 py-1 hover:text-white/80 hover:border-white/40 transition-colors"
              >
                enter ↵
              </button>
            )}

            {(state === 'results' || state === 'error') && (
              <button
                type="button"
                onClick={handleReset}
                className="flex-shrink-0 text-xs text-gray-400 hover:text-gray-700 transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Analyzing — loading state centered on page */}
      {state === 'analyzing' && (
        <div className="fixed inset-0 flex flex-col items-center justify-center gap-5" style={{ zIndex: 30 }}>
          {/* Bouncing dots */}
          <div className="flex gap-2">
            {[0, 150, 300].map(delay => (
              <span
                key={delay}
                className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>

          {/* Rotating message */}
          <p
            key={loadingMsg}
            className="text-sm text-gray-500 font-medium animate-pulse"
          >
            {loadingMsg}
          </p>

          {/* Indeterminate bar */}
          <div className="w-56 h-0.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full w-2/5 bg-gray-400 rounded-full"
              style={{ animation: 'slide-indeterminate 1.6s ease-in-out infinite' }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {state === 'error' && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 30 }}>
          <div className="text-center space-y-3 px-6">
            <p className="text-gray-700 font-medium">{errorMsg}</p>
            <button
              onClick={handleReset}
              className="text-sm text-gray-400 hover:text-gray-700 underline transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {state === 'results' && data && (
        <div className="pt-20 pb-16 px-6 max-w-4xl mx-auto space-y-6">
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
          <EvidencePosts posts={data.evidencePosts} />
          <NarrativeSummary narrative={data.aggregate.narrative} />
          <p className="text-xs text-gray-400 border-t border-gray-100 pt-4">
            This page summarizes public X (Twitter) discussion. It is not investment advice,
            a recommendation, or a prediction. Sentiment data should never be the sole basis
            for investment decisions.
          </p>
        </div>
      )}
    </>
  )
}
