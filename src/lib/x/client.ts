import type { XPost } from './types'

const X_API_BASE = 'https://api.x.com/2'

// ─── Text cleaning ────────────────────────────────────────────────────────────
// Removes noise that hurts FinBERT accuracy.
// Keeps: $TICKER cashtags, #hashtags, numbers, financial terms.
// Removes: RT prefix, @mentions, t.co URLs, extra whitespace.
export function cleanTextForScoring(text: string): string {
  return text
    .replace(/^RT @[\w\d_]+:\s*/i, '')
    .replace(/@[\w\d_]+/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── Query builder ────────────────────────────────────────────────────────────
// Cashtag ($TICKER) is the primary signal — most reliable indicator a post is
// about a specific stock. Plain "TICKER stock" catches posts that skip the cashtag.
// All operators are Free tier compatible.
// Do NOT add min_faves, min_retweets, or is:verified — Basic tier only ($100/mo).
export function buildQuery(ticker: string): string {
  const t = ticker.toUpperCase()
  return `($${t} OR "${t} stock") lang:en -is:retweet -is:reply`
}

// ─── Bot filter ───────────────────────────────────────────────────────────────
// Applied after all pages are collected so the full dataset is available.
// Real engagement is naturally skewed (many likes, few replies).
// Bots inflate all three metrics to near-equal values.
function isBotPost(
  m: { like_count: number; reply_count: number; retweet_count: number },
  text: string,
  userCreatedAt: string | undefined
): boolean {
  const total  = m.like_count + m.retweet_count + m.reply_count
  const spread = Math.max(m.like_count, m.reply_count, m.retweet_count)
               - Math.min(m.like_count, m.reply_count, m.retweet_count)
  if (total < 3) return true                        // ghost post, no signal
  if (spread <= 2 && m.like_count < 10) return true // coordinated inflation
  // Reply-spike: bots flood replies while likes stay near zero (e.g. 9 replies, 1 like)
  if (m.reply_count > (m.like_count + m.retweet_count) * 2 && m.like_count < 5) return true
  // Multi-ticker spam: promotion bots tag 3+ cashtags in one post
  const cashtags = text.match(/\$[A-Z]{1,5}/g) ?? []
  if (cashtags.length > 2) return true
  // New account: accounts created < 30 days ago are high-risk
  if (userCreatedAt) {
    const ageMs = Date.now() - new Date(userCreatedAt).getTime()
    if (ageMs < 30 * 24 * 3600 * 1000) return true
  }
  return false
}

// ─── Fetch posts ──────────────────────────────────────────────────────────────
// Phase 1 — collect: paginate through all available pages, building raw list.
// Phase 2 — filter: apply bot detection and text quality checks on the full set.
export async function fetchXPosts(
  ticker: string,
  maxPosts: number = 200
): Promise<XPost[]> {
  const bearerToken = process.env.X_BEARER_TOKEN
  if (!bearerToken) throw new Error('X_BEARER_TOKEN is not set in environment')

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000)
  const query = buildQuery(ticker)

  // ── Phase 1: collect all raw tweets across pages ───────────────────────────
  type RawTweet = {
    id: string
    text: string
    author_id: string
    created_at: string
    public_metrics: { like_count: number; reply_count: number; retweet_count: number; quote_count: number }
    lang?: string
  }

  const rawTweets: RawTweet[] = []
  const userMap = new Map<string, { username: string; name: string; created_at?: string }>()
  let nextToken: string | undefined = undefined
  const maxPages = Math.ceil(maxPosts / 100)

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({
      query,
      max_results: '100',
      start_time: sevenDaysAgo.toISOString(),
      sort_order: 'relevancy',
      'tweet.fields': 'created_at,public_metrics,author_id,lang',
      expansions: 'author_id',
      'user.fields': 'username,name,created_at',
    })
    if (nextToken) params.set('pagination_token', nextToken)

    const res = await fetch(`${X_API_BASE}/tweets/search/recent?${params}`, {
      headers: { Authorization: `Bearer ${bearerToken}` },
      cache: 'no-store',
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(`X API ${res.status}: ${JSON.stringify(body)}`)
    }

    const data = await res.json()

    // Accumulate user expansions across all pages
    for (const user of (data.includes?.users ?? [])) {
      userMap.set(user.id, { username: user.username, name: user.name, created_at: user.created_at })
    }

    rawTweets.push(...(data.data ?? []))

    nextToken = data.meta?.next_token
    if (!nextToken) break
  }

  // ── Phase 2: filter and map on the complete dataset ────────────────────────
  const posts: XPost[] = []

  for (const tweet of rawTweets) {
    // Text quality check
    const cleaned = cleanTextForScoring(tweet.text)
    if (cleaned.length < 15) continue

    // Bot filter (uses full dataset — no early cutoff during collection)
    const user = userMap.get(tweet.author_id)
    if (isBotPost(tweet.public_metrics, tweet.text, user?.created_at)) continue

    const permalink = user
      ? `https://x.com/${user.username}/status/${tweet.id}`
      : `https://x.com/i/web/status/${tweet.id}`

    posts.push({
      id: tweet.id,
      text: tweet.text,
      cleanedText: cleaned,
      authorUsername: user?.username ?? null,
      authorName: user?.name ?? null,
      permalink,
      likeCount: tweet.public_metrics.like_count,
      replyCount: tweet.public_metrics.reply_count,
      retweetCount: tweet.public_metrics.retweet_count,
      quoteCount: tweet.public_metrics.quote_count,
      createdAt: new Date(tweet.created_at),
    })
  }

  return posts
}
