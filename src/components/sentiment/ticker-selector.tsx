'use client'
import { useRouter } from 'next/navigation'
import { MAG_7_TICKERS } from '@/lib/sentiment/constants'

const TICKER_NAMES: Record<string, string> = {
  NVDA: 'NVIDIA',
  AAPL: 'Apple',
  MSFT: 'Microsoft',
  GOOGL: 'Alphabet',
  AMZN: 'Amazon',
  META: 'Meta',
  TSLA: 'Tesla',
}

export function TickerSelector({ currentTicker }: { currentTicker: string }) {
  const router = useRouter()

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="ticker-select" className="text-sm font-medium text-gray-700">
        Select stock
      </label>
      <select
        id="ticker-select"
        value={currentTicker}
        onChange={e => router.push(`/sentiment?ticker=${e.target.value}`)}
        className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
      >
        {MAG_7_TICKERS.map(t => (
          <option key={t} value={t}>
            {t} — {TICKER_NAMES[t]}
          </option>
        ))}
      </select>
    </div>
  )
}
