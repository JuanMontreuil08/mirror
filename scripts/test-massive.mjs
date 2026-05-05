i// Test script for Massive news API — run with: node scripts/test-massive.mjs
// Reads MASSIVE_API_KEY from .env.local automatically.

import { readFileSync } from 'fs'
import { resolve } from 'path'

// ── Load .env.local ────────────────────────────────────────────────────────────
const envPath = resolve(process.cwd(), '.env.local')
for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
}

const TICKER = 'AAPL'
const API_BASE = 'https://api.massive.com/v2/reference'
const apiKey = process.env.MASSIVE_API_KEY

if (!apiKey) {
  console.error('❌  MASSIVE_API_KEY not found in .env.local')
  process.exit(1)
}

const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()

const params = new URLSearchParams({
  ticker: TICKER,
  limit: '50',
  sort: 'published_utc',
  order: 'desc',
  'published_utc.gte': sevenDaysAgo,
})

console.log(`\nFetching news for $${TICKER} from the last 7 days...\n`)

const res = await fetch(`${API_BASE}/news?${params}`, {
  headers: {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
  },
})

console.log(`Status: ${res.status} ${res.statusText}`)

if (!res.ok) {
  const body = await res.json().catch(() => ({}))
  console.error('❌  API error:', JSON.stringify(body, null, 2))
  process.exit(1)
}

const data = await res.json()
const articles = data.results ?? []

console.log(`Total articles returned: ${articles.length}\n`)
console.log('─'.repeat(60))

const filtered = articles.filter(a => a.tickers?.length === 1 && a.tickers[0] === TICKER)

console.log(`Articles after single-ticker filter: ${filtered.length} / ${articles.length}\n`)

for (const article of filtered) {
  console.log(`\n📰  ${article.title}`)
  console.log(`    Publisher : ${article.publisher?.name ?? 'unknown'}`)
  console.log(`    Published : ${article.published_utc}`)
  console.log(`    Tickers   : ${article.tickers?.join(', ')}`)
  console.log(`    URL       : ${article.article_url}`)
  if (article.description) {
    console.log(`    Desc      : ${article.description.slice(0, 120)}...`)
  }
  if (article.insights?.length) {
    for (const insight of article.insights) {
      if (insight.ticker === TICKER) {
        console.log(`    Sentiment : [${insight.sentiment}] ${insight.sentiment_reasoning}`)
      }
    }
  }
}

console.log('\n' + '─'.repeat(60))
console.log(`\nRaw first filtered article (full):\n`)
console.log(JSON.stringify(filtered[0], null, 2))
