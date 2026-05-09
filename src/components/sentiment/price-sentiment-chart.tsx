'use client'
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { DailyCandle } from '@/lib/alpaca/client'

type SentimentPoint = {
  computed_at: string
  sentiment_score: number
  post_count: number
}

type ChartDataPoint = {
  date: string
  price: number | null
  sentiment: number | null
}

function toYMD(iso: string): string {
  return iso.slice(0, 10)
}

export function PriceSentimentChart({
  historicalPrices,
  sentimentHistory,
}: {
  historicalPrices: DailyCandle[]
  sentimentHistory: SentimentPoint[]
}) {
  const sentimentByDate = new Map<string, number>()
  for (const s of sentimentHistory) {
    sentimentByDate.set(toYMD(s.computed_at), s.sentiment_score)
  }

  const data: ChartDataPoint[] = historicalPrices.map(p => ({
    date: p.date,
    price: p.close,
    sentiment: sentimentByDate.get(p.date) ?? null,
  }))

  if (data.length === 0) return null

  const formatDate = (d: string) => {
    const [, m, day] = d.split('-')
    return `${m}/${day}`
  }

  return (
    <div className="glass-card rounded-[20px] p-6">
      <div className="mb-5">
        <h3
          className="font-ui text-base font-medium"
          style={{ color: 'var(--color-text)' }}
        >
          Price & Daily News Sentiment
        </h3>
        <p
          className="font-ui text-sm mt-1"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Last 30 days. Sentiment data accumulates as the pipeline runs — may be sparse early on.
        </p>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.07)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 11, fill: 'rgba(0,0,0,0.40)', fontFamily: 'DM Mono, monospace' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="price"
            orientation="left"
            tick={{ fontSize: 11, fill: 'rgba(0,0,0,0.40)', fontFamily: 'DM Mono, monospace' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `$${v}`}
          />
          <YAxis
            yAxisId="sentiment"
            orientation="right"
            domain={[-1, 1]}
            tick={{ fontSize: 11, fill: 'rgba(0,0,0,0.40)', fontFamily: 'DM Mono, monospace' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => v.toFixed(1)}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 10,
              backgroundColor: 'rgba(255,255,255,0.90)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0,0,0,0.10)',
              color: '#1D1D1F',
              fontFamily: 'DM Mono, monospace',
            }}
            formatter={(value, name) => {
              const v = Number(value)
              return name === 'price' ? [`$${v.toFixed(2)}`, 'Price'] : [v.toFixed(2), 'Sentiment']
            }}
          />
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="price"
            stroke="rgba(0,0,0,0.70)"
            strokeWidth={1.5}
            dot={false}
            name="price"
          />
          <Bar
            yAxisId="sentiment"
            dataKey="sentiment"
            fill="#34D399"
            opacity={0.55}
            radius={[3, 3, 0, 0]}
            name="sentiment"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
