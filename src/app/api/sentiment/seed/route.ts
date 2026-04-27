import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getMockPostsForTicker } from '@/lib/reddit/mock-posts'
import { sentimentScorer } from '@/lib/sentiment/scorer'
import { aggregate } from '@/lib/sentiment/aggregator'
import { generateNarrative } from '@/lib/sentiment/narrative'
import { MAG_7_TICKERS, type Mag7Ticker } from '@/lib/sentiment/constants'
import type { ScoredPost } from '@/lib/sentiment/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tickerParam = searchParams.get('ticker')

  const tickers: Mag7Ticker[] = tickerParam
    ? [tickerParam.toUpperCase() as Mag7Ticker]
    : [...MAG_7_TICKERS]

  const invalid = tickers.find(t => !MAG_7_TICKERS.includes(t))
  if (invalid) {
    return NextResponse.json({ error: `Invalid ticker: ${invalid}` }, { status: 400 })
  }

  const results: Record<string, string> = {}

  for (const ticker of tickers) {
    try {
      const posts = getMockPostsForTicker(ticker)
      if (posts.length === 0) {
        results[ticker] = 'no mock posts found'
        continue
      }

      // Score all posts via FinBERT
      const texts = posts.map(p => `${p.title}\n${p.body}`)
      const scores = await sentimentScorer.scoreBatch(texts)
      const scored: ScoredPost[] = posts.map((post, idx) => ({ ...post, ...scores[idx] }))

      // Aggregate
      const agg = aggregate(scored)

      // Generate narrative via Gemini
      const narrative = await generateNarrative(ticker, agg)

      // Write to Supabase: insert new sentiment_cache row
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
          refresh_window_hours: 24,
        })
        .select('id')
        .single()

      if (cacheErr) throw new Error(`sentiment_cache insert failed: ${cacheErr.message}`)

      // Write all scored posts
      const evidenceIds = new Set(agg.evidencePosts.map(p => p.id))
      const postRows = scored.map(p => ({
        sentiment_cache_id: cacheRow.id,
        ticker,
        reddit_id: p.id,
        permalink: p.permalink,
        subreddit: p.subreddit,
        author: p.author,
        title: p.title,
        body_excerpt: p.body,
        upvotes: p.upvotes,
        comment_count: p.commentCount,
        posted_at: p.postedAt.toISOString(),
        sentiment_score: p.score,
        sentiment_label: p.label,
        is_evidence: evidenceIds.has(p.id),
      }))

      const { error: postsErr } = await supabase.from('reddit_posts_cache').insert(postRows)
      if (postsErr) throw new Error(`reddit_posts_cache insert failed: ${postsErr.message}`)

      results[ticker] = `ok — ${agg.postCount} posts, label: ${agg.label}, score: ${agg.score.toFixed(2)}`
    } catch (err) {
      results[ticker] = `error: ${String(err)}`
    }
  }

  return NextResponse.json({ results })
}
