import { redirect } from 'next/navigation'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { getLatestPrices } from '@/lib/finnhub/client'
import { getHistoricalPrices } from '@/lib/alpaca/client'
import { MAG_7_TICKERS } from '@/lib/sentiment/constants'
import { TickerSelector } from '@/components/sentiment/ticker-selector'
import { SentimentHeader } from '@/components/sentiment/sentiment-header'
import { PriceSentimentChart } from '@/components/sentiment/price-sentiment-chart'
import { PolarizationBar } from '@/components/sentiment/polarization-bar'
import { EvidencePosts } from '@/components/sentiment/evidence-posts'
import { NarrativeSummary } from '@/components/sentiment/narrative-summary'

export default async function SentimentPage({
  searchParams,
}: {
  searchParams: Promise<{ ticker?: string }>
}) {
  const params = await searchParams
  const ticker = (params.ticker?.toUpperCase() ?? 'NVDA')

  if (!MAG_7_TICKERS.includes(ticker as typeof MAG_7_TICKERS[number])) {
    redirect('/sentiment?ticker=NVDA')
  }

  const supabase = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: latest } = await supabase
    .from('sentiment_cache')
    .select('*')
    .eq('ticker', ticker)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  const { data: sentimentHistory } = await supabase
    .from('sentiment_cache')
    .select('computed_at, sentiment_score, post_count')
    .eq('ticker', ticker)
    .gte('computed_at', thirtyDaysAgo)
    .order('computed_at', { ascending: true })

  const { data: evidencePosts } = latest
    ? await supabase
        .from('reddit_posts_cache')
        .select('*')
        .eq('sentiment_cache_id', latest.id)
        .eq('is_evidence', true)
        .order('upvotes', { ascending: false })
    : { data: [] }

  const [currentPrices, historicalPrices] = await Promise.all([
    getLatestPrices([ticker]),
    getHistoricalPrices(ticker, 30),
  ])
  const currentPrice = currentPrices[ticker]

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sentiment</h1>
        <p className="text-sm text-gray-500 mt-1">
          What the Reddit crowd is saying about Magnificent 7 stocks.
        </p>
      </header>

      <div className="mb-8">
        <TickerSelector currentTicker={ticker} />
      </div>

      {!latest ? (
        <EmptyState ticker={ticker} />
      ) : (
        <div className="space-y-6">
          <SentimentHeader
            ticker={ticker}
            currentPrice={currentPrice}
            aggregate={latest}
          />
          <PriceSentimentChart
            historicalPrices={historicalPrices}
            sentimentHistory={sentimentHistory ?? []}
          />
          <PolarizationBar
            positiveCount={latest.positive_count}
            neutralCount={latest.neutral_count}
            negativeCount={latest.negative_count}
            polarizationLabel={latest.polarization_label}
          />
          <EvidencePosts posts={evidencePosts ?? []} />
          <NarrativeSummary narrative={latest.narrative} />
        </div>
      )}

      <Disclaimer />
    </div>
  )
}

function EmptyState({ ticker }: { ticker: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
      <p className="text-base font-medium text-gray-700">No sentiment data yet for {ticker}</p>
      <p className="text-sm text-gray-400 mt-2">
        Run the seed to populate data:{' '}
        <code className="bg-white border border-gray-200 rounded px-1.5 py-0.5 text-xs font-mono">
          POST /api/sentiment/seed?ticker={ticker}
        </code>
      </p>
    </div>
  )
}

function Disclaimer() {
  return (
    <p className="mt-10 text-xs text-gray-400 border-t border-gray-100 pt-4">
      This page summarizes public Reddit discussion. It is not investment advice, a recommendation,
      or a prediction. Sentiment data should never be used as the sole basis for investment decisions.
    </p>
  )
}
