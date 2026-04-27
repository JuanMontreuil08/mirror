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
  Legend,
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
  // Group sentiment by date — keep the last entry per day (most recent refresh)
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
    <div className="rounded-lg border border-gray-100 bg-white p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Price & Daily Reddit Sentiment</h3>
        <p className="text-sm text-gray-500 mt-1">
          Last 30 days. Sentiment data accumulates as the pipeline runs — may be sparse early on.
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="price"
            orientation="left"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `$${v}`}
          />
          <YAxis
            yAxisId="sentiment"
            orientation="right"
            domain={[-1, 1]}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => v.toFixed(1)}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: '#e5e7eb' }}
            formatter={(value, name) => {
              const v = Number(value)
              return name === 'price' ? [`$${v.toFixed(2)}`, 'Price'] : [v.toFixed(2), 'Sentiment']
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="price"
            stroke="#111827"
            strokeWidth={2}
            dot={false}
            name="price"
          />
          <Bar
            yAxisId="sentiment"
            dataKey="sentiment"
            fill="#10b981"
            opacity={0.65}
            radius={[2, 2, 0, 0]}
            name="sentiment"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
