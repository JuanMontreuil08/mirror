import type { ScoredPost } from '@/lib/sentiment/types'

const MASSIVE_API_BASE = 'https://api.massive.com/v2/reference'

// ─── Score mapping ─────────────────────────────────────────────────────────────
// Converts Massive insight sentiment label to a signed score matching ScoredPost.
// Confidence is fixed at 0.8 — news insights are specific and sourced.
function insightToScore(sentiment: string): { label: 'positive' | 'neutral' | 'negative'; score: number; confidence: number } {
  if (sentiment === 'positive') return { label: 'positive', score: 0.8, confidence: 0 }
  if (sentiment === 'negative') return { label: 'negative', score: -0.8, confidence: 0 }
  return { label: 'neutral', score: 0, confidence: 0 }
}

// ─── Fetch news articles ───────────────────────────────────────────────────────
// Returns news articles pre-scored from Massive insights — no FinBERT call needed.
// Only articles where this ticker is the sole focus are included.
export async function fetchMassiveNews(ticker: string): Promise<ScoredPost[]> {
  const apiKey = process.env.MASSIVE_API_KEY
  if (!apiKey) throw new Error('MASSIVE_API_KEY is not set in environment')

  const symbol = ticker.toUpperCase()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()

  const params = new URLSearchParams({
    ticker: symbol,
    limit: '50',
    sort: 'published_utc',
    order: 'desc',
    'published_utc.gte': sevenDaysAgo,
  })

  const res = await fetch(`${MASSIVE_API_BASE}/news?${params}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`Massive API ${res.status}: ${JSON.stringify(body)}`)
  }

  const data = await res.json()
  const articles: MassiveArticle[] = data.results ?? []

  const posts: ScoredPost[] = []

  for (const article of articles) {
    // Only include articles where this ticker is a primary focus (max 3 tickers total)
    if (!article.tickers?.includes(symbol) || article.tickers.length > 5) continue

    // Require an insight for this ticker — it carries the pre-computed sentiment
    const insight = article.insights?.find(i => i.ticker === symbol)
    if (!insight) continue

    const body = article.description
      ? `${article.title}. ${article.description}`
      : article.title

    if (body.length < 15) continue

    posts.push({
      id: article.id,
      text: article.title,
      cleanedText: body,
      authorUsername: article.publisher?.name ?? null,
      authorName: article.author ?? null,
      permalink: article.article_url,
      likeCount: 0,
      replyCount: 0,
      retweetCount: 0,
      quoteCount: 0,
      createdAt: new Date(article.published_utc),
      ...insightToScore(insight.sentiment),
    })
  }

  return posts
}

// ─── Internal response type ────────────────────────────────────────────────────
type MassiveArticle = {
  id: string
  title: string
  description: string | null
  article_url: string
  author: string | null
  published_utc: string
  tickers: string[]
  publisher: {
    name: string
    homepage_url: string
  } | null
  insights: {
    ticker: string
    sentiment: string
    sentiment_reasoning: string
  }[]
}
