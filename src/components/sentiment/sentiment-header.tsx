import type { TickerPrice } from '@/lib/finnhub/client'

type SentimentCacheRow = {
  sentiment_label: string
  sentiment_score: number
  post_count: number
  computed_at: string
}

const LABEL_DISPLAY: Record<string, { text: string; color: string; dot: string }> = {
  positive:        { text: 'Positive',        color: 'text-green-700',  dot: 'bg-green-500' },
  mostly_positive: { text: 'Mostly Positive', color: 'text-green-600',  dot: 'bg-green-400' },
  mixed:           { text: 'Mixed',           color: 'text-gray-600',   dot: 'bg-gray-400' },
  mostly_negative: { text: 'Mostly Negative', color: 'text-orange-600', dot: 'bg-orange-400' },
  negative:        { text: 'Negative',        color: 'text-red-700',    dot: 'bg-red-500' },
  low_activity:    { text: 'Low Activity',    color: 'text-gray-400',   dot: 'bg-gray-300' },
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `${mins} minutes ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hours ago`
  return `${Math.floor(hours / 24)} days ago`
}

export function SentimentHeader({
  ticker,
  currentPrice,
  aggregate,
}: {
  ticker: string
  currentPrice: TickerPrice | undefined
  aggregate: SentimentCacheRow
}) {
  const display = LABEL_DISPLAY[aggregate.sentiment_label] ?? LABEL_DISPLAY.mixed
  const priceChange = currentPrice?.changePct ?? 0

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{ticker}</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Updated {relativeTime(aggregate.computed_at)}
          </p>
        </div>
        {currentPrice && (
          <div className="text-right">
            <p className="text-2xl font-semibold text-gray-900">
              ${currentPrice.price.toFixed(2)}
            </p>
            <p className={`text-sm font-medium ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}% today
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
        <span className={`inline-block h-3 w-3 rounded-full flex-shrink-0 ${display.dot}`} />
        <div>
          <p className={`text-lg font-semibold ${display.color}`}>{display.text}</p>
          <p className="text-sm text-gray-500">
            {aggregate.post_count < 20
              ? `Only ${aggregate.post_count} posts in the last 24 hours — interpret with caution.`
              : `Based on ${aggregate.post_count} Reddit posts in the last 24 hours.`}
          </p>
        </div>
      </div>
    </div>
  )
}
