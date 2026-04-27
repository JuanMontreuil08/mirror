'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Position, Transaction } from '@/types'
import { TickerPrice } from '@/lib/finnhub/client'
import { NewsItem } from '@/lib/firecrawl/client'
import { fetchStockNews } from '@/app/actions/news'

// ─── Ticker Logo ──────────────────────────────────────────────────────────────

function TickerLogo({ ticker, color, size = 32 }: { ticker: string; color: string; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.38 }}
    >
      {ticker[0]}
    </div>
  )
}

const PALETTE = ['#18181b', '#4f46e5', '#0891b2', '#059669', '#d97706', '#7c3aed', '#db2777', '#dc2626']

interface Props {
  positions: Position[]
  transactions: Transaction[]
  prices: Record<string, TickerPrice>
  pricesFetchedAt: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function holdingPeriod(txs: Transaction[]): { label: string; isLongTerm: boolean } | null {
  if (txs.length === 0) return null
  const oldest = txs.reduce(
    (min, t) => (t.transaction_date < min ? t.transaction_date : min),
    txs[0].transaction_date
  )
  const days = Math.floor((Date.now() - new Date(oldest + 'T00:00:00').getTime()) / 86_400_000)
  const isLongTerm = days >= 365
  if (days < 30) return { label: `${days}d`, isLongTerm }
  if (days < 365) return { label: `${Math.floor(days / 30)}mo`, isLongTerm }
  return { label: `${(days / 365).toFixed(1)}yr`, isLongTerm }
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────

function DonutChart({ segments }: { segments: { ticker: string; weight: number; color: string }[] }) {
  const cx = 80, cy = 80, r = 56, strokeWidth = 22
  const circumference = 2 * Math.PI * r
  const gap = 0.012 // gap between segments as fraction of total

  let cumulative = 0

  return (
    <svg width={160} height={160} viewBox="0 0 160 160" className="flex-shrink-0">
      {/* Background ring */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f4f4f5" strokeWidth={strokeWidth} />
      {segments.map(({ ticker, weight, color }) => {
        const start = cumulative
        cumulative += weight
        const segWeight = Math.max(weight - gap, 0)
        const dashLength = segWeight * circumference
        const offset = -(start * circumference)
        return (
          <circle
            key={ticker}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dashLength} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="butt"
            style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
          />
        )
      })}
    </svg>
  )
}

// ─── Position Card ────────────────────────────────────────────────────────────

function PositionCard({
  position,
  transactions,
  weight,
  color,
}: {
  position: Position
  transactions: Transaction[]
  weight: number
  color: string
}) {
  const isConcentrated = weight >= 35
  const holding = holdingPeriod(transactions)

  return (
    <div className="border border-gray-100 rounded-xl bg-white px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        {/* Left: logo + ticker + holding period */}
        <div className="flex items-center gap-3 min-w-0">
          <TickerLogo ticker={position.ticker} color={color} size={36} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{position.ticker}</span>
              {holding && (
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  holding.isLongTerm ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {holding.label}
                </span>
              )}
            </div>
            {position.company_name && (
              <div className="text-xs text-gray-400 truncate">{position.company_name}</div>
            )}
          </div>
        </div>

        {/* Right: shares + avg + total + weight */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-gray-400">
              {Number(position.quantity) % 1 === 0
                ? Number(position.quantity).toFixed(0)
                : Number(position.quantity).toFixed(4)}{' '}
              shares · avg ${Number(position.avg_buy_price).toFixed(2)}
            </div>
            <div className="text-sm font-medium text-gray-900">
              ${Number(position.total_invested).toFixed(2)}
            </div>
          </div>
          <span className={`text-sm font-semibold px-2 py-0.5 rounded-lg ${
            isConcentrated ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {weight.toFixed(1)}%{isConcentrated && ' ⚠'}
          </span>
        </div>
      </div>

      {/* Mobile secondary row */}
      <div className="sm:hidden mt-2 flex justify-between text-xs text-gray-400">
        <span>
          {Number(position.quantity) % 1 === 0
            ? Number(position.quantity).toFixed(0)
            : Number(position.quantity).toFixed(4)}{' '}
          shares · avg ${Number(position.avg_buy_price).toFixed(2)}
        </span>
        <span className="font-medium text-gray-700">${Number(position.total_invested).toFixed(2)}</span>
      </div>
    </div>
  )
}

// ─── Activity Panel ───────────────────────────────────────────────────────────

function ActivityPanel({
  positions,
  transactions,
  colorMap,
}: {
  positions: Position[]
  transactions: Record<string, Transaction[]>
  colorMap: Record<string, string>
}) {
  const [tab, setTab] = useState<'transactions' | 'news'>('transactions')
  const [selectedTicker, setSelectedTicker] = useState(positions[0]?.ticker ?? '')
  const [news, setNews] = useState<NewsItem[]>([])
  const [newsLoading, setNewsLoading] = useState(false)
  const [newsCache, setNewsCache] = useState<Record<string, NewsItem[]>>({})

  const tickers = positions.map((p) => p.ticker)

  const loadNews = useCallback(async (ticker: string) => {
    if (newsCache[ticker]) {
      setNews(newsCache[ticker])
      return
    }
    setNewsLoading(true)
    setNews([])
    const items = await fetchStockNews(ticker)
    setNews(items)
    setNewsCache((prev) => ({ ...prev, [ticker]: items }))
    setNewsLoading(false)
  }, [newsCache])

  useEffect(() => {
    if (tab === 'news') loadNews(selectedTicker)
  }, [tab, selectedTicker, loadNews])

  const handleTickerChange = (ticker: string) => {
    setSelectedTicker(ticker)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-gray-100">
        {(['transactions', 'news'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-6 py-3.5 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? 'text-gray-900 border-b-2 border-gray-900 -mb-px'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Stock selector */}
      <div className="flex gap-2 px-5 py-3 border-b border-gray-50 overflow-x-auto">
        {tickers.map((ticker) => (
          <button
            key={ticker}
            onClick={() => handleTickerChange(ticker)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 transition-colors ${
              selectedTicker === ticker
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: selectedTicker === ticker ? 'white' : colorMap[ticker] }}
            />
            {ticker}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-5">
        {tab === 'transactions' && (
          <>
            {(transactions[selectedTicker] ?? []).length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No transactions for {selectedTicker}.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-400 pb-2">Date</th>
                    <th className="text-left text-xs font-medium text-gray-400 pb-2">Type</th>
                    <th className="text-right text-xs font-medium text-gray-400 pb-2">Shares</th>
                    <th className="text-right text-xs font-medium text-gray-400 pb-2">Price</th>
                    <th className="text-right text-xs font-medium text-gray-400 pb-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[...(transactions[selectedTicker] ?? [])]
                    .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
                    .map((tx) => (
                      <tr key={tx.id} className="border-t border-gray-50">
                        <td className="py-2.5 text-sm text-gray-600">{formatDate(tx.transaction_date)}</td>
                        <td className="py-2.5">
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                            tx.transaction_type === 'buy' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {tx.transaction_type}
                          </span>
                        </td>
                        <td className="py-2.5 text-right text-sm text-gray-600">
                          {Number(tx.quantity) % 1 === 0 ? Number(tx.quantity).toFixed(0) : Number(tx.quantity).toFixed(4)}
                        </td>
                        <td className="py-2.5 text-right text-sm text-gray-600">
                          ${Number(tx.price_per_share).toFixed(2)}
                        </td>
                        <td className="py-2.5 text-right text-sm font-medium text-gray-900">
                          ${Number(tx.total_amount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {tab === 'news' && (
          <div className="space-y-4">
            {newsLoading && (
              <div className="py-8 flex flex-col items-center gap-2">
                <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                <p className="text-xs text-gray-400">Loading news for {selectedTicker}…</p>
              </div>
            )}

            {!newsLoading && news.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">No news found for {selectedTicker}.</p>
            )}

            {!newsLoading && news.map((item, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400">{item.source} · {formatDate(item.date)}</span>
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-gray-900 leading-snug mb-1 hover:underline block"
                  >
                    {item.title}
                  </a>
                  {item.summary && (
                    <p className="text-xs text-gray-500 leading-relaxed">{item.summary}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

// ─── Price Ticker Bar ─────────────────────────────────────────────────────────

function TickerItem({ p, price }: { p: Position; price: TickerPrice }) {
  const up = price.changePct >= 0
  return (
    <div className="flex items-center gap-2.5 flex-shrink-0 px-6">
      <span className="text-sm font-semibold text-gray-900">{p.ticker}</span>
      <span className="text-sm text-gray-600">${price.price.toFixed(2)}</span>
      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
        up ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
      }`}>
        {up ? '▲' : '▼'} {Math.abs(price.changePct).toFixed(2)}%
      </span>
      <span className="text-gray-200 select-none">·</span>
    </div>
  )
}

function PriceBar({ positions, prices, fetchedAt }: { positions: Position[]; prices: Record<string, TickerPrice>; fetchedAt: string }) {
  const items = positions.filter((p) => prices[p.ticker])
  if (items.length === 0) return null

  const time = new Date(fetchedAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })

  return (
    <div>
      <div className="bg-white border border-gray-100 rounded-xl py-3 overflow-hidden">
        {/* Items duplicated for seamless infinite loop */}
        <div className="flex animate-ticker" style={{ width: 'max-content' }}>
          {[...items, ...items].map((p, i) => (
            <TickerItem key={`${p.ticker}-${i}`} p={p} price={prices[p.ticker]} />
          ))}
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-1.5 px-1">
        Prices as of {time} · 15-min delayed (Finnhub free tier)
      </p>
    </div>
  )
}

export default function PortfolioDashboard({ positions, transactions, prices, pricesFetchedAt }: Props) {
  const totalInvested = positions.reduce((sum, p) => sum + Number(p.total_invested), 0)

  const segments = positions.map((p, i) => ({
    ticker: p.ticker,
    weight: Number(p.total_invested) / totalInvested,
    color: PALETTE[i % PALETTE.length],
  }))

  const colorMap = Object.fromEntries(positions.map((p, i) => [p.ticker, PALETTE[i % PALETTE.length]]))

  const txsByTicker = transactions.reduce<Record<string, Transaction[]>>((acc, tx) => {
    if (!acc[tx.ticker]) acc[tx.ticker] = []
    acc[tx.ticker].push(tx)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">My Portfolio</h1>
        <Link
          href="/dashboard/upload"
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          Upload voucher
        </Link>
      </div>

      {/* Price ticker bar */}
      <PriceBar positions={positions} prices={prices} fetchedAt={pricesFetchedAt} />

      {/* Overview card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-8">
          <DonutChart segments={segments} />

          {/* Stats + legend */}
          <div className="flex-1 min-w-0">
            <div className="mb-4">
              <div className="text-3xl font-semibold text-gray-900">
                ${totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-gray-400 mt-0.5">
                total invested · {positions.length} position{positions.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-2">
              {segments.map(({ ticker, weight, color }) => (
                <div key={ticker} className="flex items-center gap-2.5">
                  <TickerLogo ticker={ticker} color={color} size={20} />
                  <span className="text-sm text-gray-700 font-medium w-14">{ticker}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${weight * 100}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className={`text-xs font-medium w-10 text-right ${
                    weight >= 0.35 ? 'text-amber-600' : 'text-gray-400'
                  }`}>
                    {(weight * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Position cards */}
      <div className="space-y-2">
        {positions.map((position, i) => (
          <PositionCard
            key={position.ticker}
            position={position}
            transactions={txsByTicker[position.ticker] ?? []}
            weight={(Number(position.total_invested) / totalInvested) * 100}
            color={PALETTE[i % PALETTE.length]}
          />
        ))}
      </div>

      {/* Activity panel: Transactions + News */}
      <ActivityPanel
        positions={positions}
        transactions={txsByTicker}
        colorMap={colorMap}
      />
    </div>
  )
}
