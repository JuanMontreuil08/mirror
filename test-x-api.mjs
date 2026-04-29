/**
 * X API test — mirrors the two-phase collect-then-filter logic of client.ts.
 * Uses max_results=10 (minimum) to keep API credit usage low.
 *
 * Run: node test-x-api.mjs [TICKER] [PAGES]
 *   TICKER  — stock ticker, default AAPL
 *   PAGES   — number of pages to fetch (each = 10 posts), default 1
 *
 * Examples:
 *   node test-x-api.mjs AAPL        ← 1 page,  ~10 posts
 *   node test-x-api.mjs TSLA 3      ← 3 pages, ~30 posts
 */

import { readFileSync } from 'fs'

// Load .env.local
const env = readFileSync('.env.local', 'utf-8')
for (const line of env.split('\n')) {
  const [key, ...rest] = line.split('=')
  if (key?.trim()) process.env[key.trim()] = rest.join('=').trim()
}

const ticker      = (process.argv[2] ?? 'AAPL').toUpperCase()
const maxPages    = parseInt(process.argv[3] ?? '1', 10)
const prodMode    = process.argv.includes('--prod')
const maxResults  = prodMode ? '100' : '10'
const token       = process.env.X_BEARER_TOKEN
if (!token) { console.error('X_BEARER_TOKEN not found in .env.local'); process.exit(1) }

// ── Helpers (mirrors client.ts exactly) ───────────────────────────────────────
function buildQuery(ticker) {
  return `($${ticker} OR "${ticker} stock") lang:en -is:retweet -is:reply`
}

function cleanText(text) {
  return text
    .replace(/^RT @[\w\d_]+:\s*/i, '')
    .replace(/@[\w\d_]+/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function isBotPost(m, text, userCreatedAt) {
  const total  = m.like_count + m.retweet_count + m.reply_count
  const spread = Math.max(m.like_count, m.reply_count, m.retweet_count)
               - Math.min(m.like_count, m.reply_count, m.retweet_count)
  if (total < 3) return true
  if (spread <= 2 && m.like_count < 10) return true
  if (m.reply_count > (m.like_count + m.retweet_count) * 2 && m.like_count < 5) return true
  const cashtags = text.match(/\$[A-Z]{1,5}/g) ?? []
  if (cashtags.length > 2) return true
  if (userCreatedAt) {
    const ageMs = Date.now() - new Date(userCreatedAt).getTime()
    if (ageMs < 30 * 24 * 3600 * 1000) return true
  }
  return false
}

// ── Phase 1: collect all pages ────────────────────────────────────────────────
const query       = buildQuery(ticker)
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000)

console.log(`\nQuery: ${query}`)
console.log(`Mode  : ${prodMode ? 'PRODUCTION (max_results=100)' : 'test (max_results=10)'}`)
console.log(`Pages: ${maxPages} × ${maxResults} posts = up to ${maxPages * parseInt(maxResults)} raw posts\n`)

const rawTweets = []
const userMap   = new Map()
let nextToken   = undefined

for (let page = 0; page < maxPages; page++) {
  const params = new URLSearchParams({
    query,
    max_results: maxResults,
    start_time: sevenDaysAgo.toISOString(),
    sort_order: 'relevancy',
    'tweet.fields': 'created_at,public_metrics,author_id',
    expansions: 'author_id',
    'user.fields': 'username,name,created_at',
  })
  if (nextToken) params.set('pagination_token', nextToken)

  console.log(`→ Fetching page ${page + 1}...`)
  const res  = await fetch(`https://api.x.com/2/tweets/search/recent?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()

  if (!res.ok) { console.error('API error:', JSON.stringify(data, null, 2)); process.exit(1) }

  for (const u of (data.includes?.users ?? [])) userMap.set(u.id, { username: u.username, name: u.name, created_at: u.created_at })
  rawTweets.push(...(data.data ?? []))

  nextToken = data.meta?.next_token
  if (!nextToken) { console.log('  No more pages.'); break }
}

// ── Phase 2: filter the full collected set ────────────────────────────────────
const posts = []
let skippedShort = 0
let skippedBots  = 0
let skipReasons  = { ghost: 0, inflation: 0, replySpike: 0, multiTicker: 0, newAccount: 0 }

function isBotPostDiag(m, text, userCreatedAt) {
  const total  = m.like_count + m.retweet_count + m.reply_count
  const spread = Math.max(m.like_count, m.reply_count, m.retweet_count)
               - Math.min(m.like_count, m.reply_count, m.retweet_count)
  if (total < 3) { skipReasons.ghost++; return true }
  if (spread <= 2 && m.like_count < 10) { skipReasons.inflation++; return true }
  if (m.reply_count > (m.like_count + m.retweet_count) * 2 && m.like_count < 5) { skipReasons.replySpike++; return true }
  const cashtags = text.match(/\$[A-Z]{1,5}/g) ?? []
  if (cashtags.length > 2) { skipReasons.multiTicker++; return true }
  if (userCreatedAt) {
    const ageMs = Date.now() - new Date(userCreatedAt).getTime()
    if (ageMs < 30 * 24 * 3600 * 1000) { skipReasons.newAccount++; return true }
  }
  return false
}

for (const tweet of rawTweets) {
  const cleaned = cleanText(tweet.text)
  if (cleaned.length < 15) { skippedShort++; continue }
  const user = userMap.get(tweet.author_id)
  if (isBotPostDiag(tweet.public_metrics, tweet.text, user?.created_at)) { skippedBots++; continue }

  posts.push({
    id: tweet.id,
    text: tweet.text,
    cleanedText: cleaned,
    authorUsername: user?.username ?? null,
    permalink: user
      ? `https://x.com/${user.username}/status/${tweet.id}`
      : `https://x.com/i/web/status/${tweet.id}`,
    likeCount:    tweet.public_metrics.like_count,
    replyCount:   tweet.public_metrics.reply_count,
    retweetCount: tweet.public_metrics.retweet_count,
    createdAt:    tweet.created_at,
  })
}

// ── Report ────────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(56)}`)
console.log(`RESULTS FOR $${ticker}`)
console.log('─'.repeat(56))
console.log(`Raw collected : ${rawTweets.length}`)
console.log(`Removed (short text) : ${skippedShort}`)
console.log(`Removed (bot filter) : ${skippedBots}`)
console.log(`  ↳ ghost (total<3)  : ${skipReasons.ghost}`)
console.log(`  ↳ inflation        : ${skipReasons.inflation}`)
console.log(`  ↳ reply-spike      : ${skipReasons.replySpike}`)
console.log(`  ↳ multi-ticker     : ${skipReasons.multiTicker}`)
console.log(`  ↳ new account      : ${skipReasons.newAccount}`)
console.log(`Clean posts   : ${posts.length}`)

if (posts.length === 0) {
  console.log('\nNo clean posts — all filtered. Try more pages or a different ticker.')
  process.exit(0)
}

console.log(`\n${'─'.repeat(56)}`)
console.log('CLEAN POSTS:')
console.log('─'.repeat(56))
for (const p of posts) {
  console.log(`\n@${p.authorUsername ?? 'unknown'}  ♥${p.likeCount}  ↩${p.replyCount}  ↻${p.retweetCount}  ${p.createdAt}`)
  console.log(`Original : ${p.text.slice(0, 110)}${p.text.length > 110 ? '...' : ''}`)
  console.log(`Cleaned  : ${p.cleanedText.slice(0, 110)}${p.cleanedText.length > 110 ? '...' : ''}`)
}

// ── Phase 3: FinBERT scoring ──────────────────────────────────────────────────
const hfKey = process.env.HUGGINGFACE_API_KEY
if (!hfKey) { console.error('HUGGINGFACE_API_KEY not found in .env.local'); process.exit(1) }

console.log(`\n${'─'.repeat(56)}`)
console.log('PHASE 3 — FinBERT scoring')
console.log('─'.repeat(56))
console.log(`Scoring ${posts.length} posts (concurrency=8)...`)

const CONCURRENCY = 8
const scoredPosts = []

for (let i = 0; i < posts.length; i += CONCURRENCY) {
  const chunk = posts.slice(i, i + CONCURRENCY)
  const results = await Promise.all(chunk.map(async p => {
    const res = await fetch('https://router.huggingface.co/hf-inference/models/ProsusAI/finbert', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hfKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: p.cleanedText.slice(0, 1500) }),
    })
    const data = await res.json()
    if (!Array.isArray(data)) throw new Error(`FinBERT error: ${JSON.stringify(data)}`)
    const labels = Array.isArray(data[0]) ? data[0] : data
    const top = labels.reduce((a, b) => (a.score > b.score ? a : b))
    const label = top.label.toLowerCase()
    const score = label === 'positive' ? top.score : label === 'negative' ? -top.score : 0
    return { ...p, label, score, confidence: top.score }
  }))
  scoredPosts.push(...results)
  console.log(`  Scored ${Math.min(i + CONCURRENCY, posts.length)}/${posts.length}`)
}

console.log()
for (const p of scoredPosts) {
  const bar = p.label === 'positive' ? '🟢' : p.label === 'negative' ? '🔴' : '⚪'
  console.log(`${bar} [${p.label.padEnd(8)} ${p.score.toFixed(3)}] @${p.authorUsername ?? 'unknown'}: ${p.cleanedText.slice(0, 80)}`)
}

// ── Phase 4: Aggregate ────────────────────────────────────────────────────────
const postCount    = scoredPosts.length
const avgScore     = scoredPosts.reduce((s, p) => s + p.score, 0) / postCount
const positiveCount = scoredPosts.filter(p => p.label === 'positive').length
const neutralCount  = scoredPosts.filter(p => p.label === 'neutral').length
const negativeCount = scoredPosts.filter(p => p.label === 'negative').length
const variance      = scoredPosts.reduce((s, p) => s + Math.pow(p.score - avgScore, 2), 0) / postCount
const polarization  = Math.sqrt(variance)

const scoreLabel = avgScore > 0.15 ? 'positive' : avgScore < -0.15 ? 'negative' : 'neutral'
const polLabel   = polarization > 0.4 ? 'highly_divided' : polarization > 0.25 ? 'divided' : 'consensus'

console.log(`\n${'─'.repeat(56)}`)
console.log('PHASE 4 — Aggregate')
console.log('─'.repeat(56))
console.log(`Score     : ${avgScore.toFixed(4)} (${scoreLabel})`)
console.log(`Posts     : ${postCount} (${positiveCount}+ ${neutralCount}~ ${negativeCount}-)`)
console.log(`Polarization : ${polarization.toFixed(4)} (${polLabel})`)

// ── Phase 5: Gemini narrative ─────────────────────────────────────────────────
const googleKey = process.env.GOOGLE_API_KEY
if (!googleKey) { console.error('GOOGLE_API_KEY not found in .env.local'); process.exit(1) }

const topPosts = [...scoredPosts]
  .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
  .slice(0, 6)
  .map(p => `[${p.label.toUpperCase()}] ${p.cleanedText}`)
  .join('\n')

const userPrompt = `Ticker: ${ticker}
Overall sentiment: ${scoreLabel} (score ${avgScore.toFixed(2)})
Post count: ${postCount}
Distribution: ${positiveCount} positive, ${neutralCount} neutral, ${negativeCount} negative
Polarization: ${polLabel.replace(/_/g, ' ')}

Representative posts:
${topPosts}

Write the 2–3 sentence summary now.`

const systemPrompt = `You are an analyst summarizing online retail-investor chatter for a stock-tracking app aimed at amateur Latin American investors.

Your job: write a 2–3 sentence summary explaining what is driving the current X (Twitter) sentiment for a given ticker.

STRICT RULES:
- NEVER give buy/sell advice or recommendations.
- NEVER use words like "bullish," "bearish," "opportunity," or any action language.
- NEVER predict price movements.
- DO describe what people are saying and why, in neutral language.
- If post count is low, say so directly.
- Keep it factual and observational.

Write in clear, conversational English. 2–3 sentences. No headers, no bullets.`

const geminiRes = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${googleKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
    }),
  }
)
const geminiData = await geminiRes.json()
const narrative = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  ?? `[Gemini error: ${JSON.stringify(geminiData)}]`

console.log(`\n${'─'.repeat(56)}`)
console.log('PHASE 5 — Narrative (Gemini)')
console.log('─'.repeat(56))
console.log(narrative)
