export interface NewsItem {
  id: string
  title: string
  source: string
  date: string
  summary: string
  url: string
  sentiment: 'positive' | 'negative' | 'neutral'
}

export async function getStockNews(ticker: string, days = 7): Promise<NewsItem[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) return []

  const tbs = days <= 1 ? 'qdr:d' : days <= 7 ? 'qdr:w' : days <= 30 ? 'qdr:m' : 'qdr:y'

  const res = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query: `"${ticker}" news -"stock price" -"price target" -chart -"technical analysis" -site:finance.yahoo.com -site:tradingview.com -site:stockanalysis.com -site:macrotrends.net`,
      limit: 3,
      tbs,
      scrapeOptions: { formats: ['markdown'] },
    }),
    next: { revalidate: 1800 }, // cache 30 min
  })

  if (!res.ok) return []

  const json = await res.json()
  const results: Array<{
    url: string
    title?: string
    description?: string
    metadata?: { publishedTime?: string; ogSiteName?: string; sourceURL?: string }
  }> = json.data ?? []

  return results.map((item, i) => {
    const rawDate = item.metadata?.publishedTime
    const date = rawDate ? rawDate.slice(0, 10) : new Date().toISOString().slice(0, 10)
    const source =
      item.metadata?.ogSiteName ??
      item.metadata?.sourceURL?.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] ??
      'News'

    return {
      id: String(i),
      title: item.title ?? `${ticker} news`,
      source,
      date,
      summary: item.description ?? '',
      url: item.url,
      sentiment: 'neutral', // sentiment analysis via Claude can be added later
    } satisfies NewsItem
  })
}
