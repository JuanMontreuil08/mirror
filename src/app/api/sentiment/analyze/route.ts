import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchMassiveNews } from '@/lib/massive/client'
import { aggregate } from '@/lib/sentiment/aggregator'
import { generateNarrative } from '@/lib/sentiment/narrative'
import { getLatestPrices } from '@/lib/finnhub/client'
import { getHistoricalPrices } from '@/lib/alpaca/client'
import type { ScoredPost } from '@/lib/sentiment/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const thirtyDaysAgo = () => new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()

async function getSentimentHistory(ticker: string) {
  const { data } = await supabase
    .from('sentiment_cache')
    .select('computed_at, sentiment_score, post_count')
    .eq('ticker', ticker)
    .gte('computed_at', thirtyDaysAgo())
    .order('computed_at', { ascending: true })
  return data ?? []
}

export async function POST(req: NextRequest) {
  const { ticker: rawTicker } = await req.json()
  const ticker = rawTicker?.trim().toUpperCase()

  if (!ticker || !/^[A-Z]{1,5}$/.test(ticker)) {
    return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 })
  }

  // ── Cache check ──────────────────────────────────────────────────────────────
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  const { data: cached } = await supabase
    .from('sentiment_cache')
    .select('*')
    .eq('ticker', ticker)
    .gte('computed_at', todayStart.toISOString())
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (cached) {
    const [{ data: cachedPosts }, currentPrices, historicalPrices, sentimentHistory] =
      await Promise.all([
        supabase
          .from('x_posts_cache')
          .select('*')
          .eq('sentiment_cache_id', cached.id)
          .order('sentiment_score', { ascending: false }),
        getLatestPrices([ticker]),
        getHistoricalPrices(ticker, 30),
        getSentimentHistory(ticker),
      ])

    return NextResponse.json({
      cached: true,
      ticker,
      aggregate: cached,
      posts: cachedPosts ?? [],
      currentPrice: currentPrices[ticker] ?? null,
      historicalPrices,
      sentimentHistory,
    })
  }

  // ── Full pipeline ────────────────────────────────────────────────────────────

  // 1. Fetch news and prices in parallel
  const [scored, currentPrices, historicalPrices] = await Promise.all([
    fetchMassiveNews(ticker),
    getLatestPrices([ticker]),
    getHistoricalPrices(ticker, 30),
  ])

  if (scored.length === 0) {
    return NextResponse.json(
      { error: `No news found for $${ticker} in the last 7 days` },
      { status: 404 }
    )
  }

  // 2. Aggregate — news is pre-scored from Massive insights, no FinBERT needed
  const agg = aggregate(scored)

  // 3. Generate narrative via Gemini
  const narrative = await generateNarrative(ticker, agg)

  // 4. Write aggregate to sentiment_cache
  const { data: cacheRow, error: cacheErr } = await supabase
    .from('sentiment_cache')
    .insert({
      ticker,
      sentiment_score: agg.score,
      sentiment_label: agg.label,
      post_count: agg.postCount,
      positive_count: agg.positiveCount,
      neutral_count: agg.neutralCount,
      negative_count: agg.negativeCount,
      polarization: agg.polarization,
      polarization_label: agg.polarizationLabel,
      narrative,
      refresh_window_hours: 168,
    })
    .select('id')
    .single()

  if (cacheErr) {
    return NextResponse.json({ error: cacheErr.message }, { status: 500 })
  }

  // 5. Write all scored posts to cache
  const postRows = scored.map(p => ({
    sentiment_cache_id: cacheRow.id,
    ticker,
    tweet_id: p.id,
    permalink: p.permalink,
    author_username: p.authorUsername,
    author_name: p.authorName,
    text: p.cleanedText,
    like_count: p.likeCount,
    reply_count: p.replyCount,
    retweet_count: p.retweetCount,
    quote_count: p.quoteCount,
    posted_at: p.createdAt.toISOString(),
    sentiment_score: p.score,
    sentiment_label: p.label,
    is_evidence: false,
  }))

  const { error: postsErr } = await supabase.from('x_posts_cache').insert(postRows)
  if (postsErr) {
    return NextResponse.json({ error: postsErr.message }, { status: 500 })
  }

  // 6. Fetch updated sentiment history
  const sentimentHistory = await getSentimentHistory(ticker)

  const mapPost = (p: ScoredPost) => ({
    id: p.id,
    ticker,
    text: p.cleanedText,
    author_username: p.authorUsername,
    author_name: p.authorName,
    permalink: p.permalink,
    like_count: p.likeCount,
    reply_count: p.replyCount,
    posted_at: p.createdAt.toISOString(),
    sentiment_label: p.label,
  })

  return NextResponse.json({
    cached: false,
    ticker,
    aggregate: {
      id: cacheRow.id,
      ticker,
      computed_at: new Date().toISOString(),
      sentiment_score: agg.score,
      sentiment_label: agg.label,
      post_count: agg.postCount,
      positive_count: agg.positiveCount,
      neutral_count: agg.neutralCount,
      negative_count: agg.negativeCount,
      polarization: agg.polarization,
      polarization_label: agg.polarizationLabel,
      narrative,
    },
    posts: scored.map(mapPost),
    currentPrice: currentPrices[ticker] ?? null,
    historicalPrices,
    sentimentHistory,
  })
}
