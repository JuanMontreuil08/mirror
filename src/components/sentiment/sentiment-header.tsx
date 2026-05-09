import type { TickerPrice } from '@/lib/finnhub/client'

type SentimentCacheRow = {
  sentiment_label: string
  sentiment_score: number
  post_count: number
  computed_at: string
}

// Map sentiment labels to Mirror design tokens (gain/loss/warn colors only)
function getSentimentStyle(label: string): { text: string; cssColor: string; dotColor: string } {
  switch (label) {
    case 'positive':        return { text: 'Positive',        cssColor: 'var(--color-gain)',       dotColor: 'var(--color-gain)' }
    case 'mostly_positive': return { text: 'Mostly Positive', cssColor: 'var(--color-gain)',       dotColor: 'var(--color-gain)' }
    case 'mostly_negative': return { text: 'Mostly Negative', cssColor: 'var(--color-loss)',       dotColor: 'var(--color-loss)' }
    case 'negative':        return { text: 'Negative',        cssColor: 'var(--color-loss)',       dotColor: 'var(--color-loss)' }
    case 'mixed':           return { text: 'Mixed',           cssColor: 'var(--color-text-muted)', dotColor: 'var(--color-text-faint)' }
    case 'low_activity':    return { text: 'Low Activity',    cssColor: 'var(--color-text-faint)', dotColor: 'var(--color-text-faint)' }
    default:                return { text: label,             cssColor: 'var(--color-text-muted)', dotColor: 'var(--color-text-faint)' }
  }
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
  const style = getSentimentStyle(aggregate.sentiment_label)
  const priceChange = currentPrice?.changePct ?? 0

  return (
    <div className="glass-card rounded-[20px] p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2
            className="font-ui font-light text-[36px] leading-none"
            style={{ color: 'var(--color-text)' }}
          >
            {ticker}
          </h2>
          <p
            className="font-data text-[10px] uppercase tracking-[0.1em] mt-1"
            style={{ color: 'var(--color-text-faint)' }}
          >
            Updated {relativeTime(aggregate.computed_at)}
          </p>
        </div>
        {currentPrice && (
          <div className="text-right">
            <p
              className="font-ui font-light text-[28px] leading-none tabular-nums"
              style={{ color: 'var(--color-text)' }}
            >
              ${currentPrice.price.toFixed(2)}
            </p>
            <p
              className="font-data text-sm tabular-nums mt-1"
              style={{ color: priceChange >= 0 ? 'var(--color-gain)' : 'var(--color-loss)' }}
            >
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}% today
            </p>
          </div>
        )}
      </div>

      <div
        className="flex items-center gap-3 pt-4"
        style={{ borderTop: '1px solid var(--color-border-sub)' }}
      >
        <span
          className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: style.dotColor }}
        />
        <div>
          <p
            className="font-ui font-light text-[22px] leading-none"
            style={{ color: style.cssColor }}
          >
            {style.text}
          </p>
          <p
            className="font-ui text-sm mt-0.5"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Based on {aggregate.post_count} news articles in the last 7 days.
          </p>
        </div>
      </div>
    </div>
  )
}
