export interface NewsItem {
  id: string
  title: string
  source: string
  date: string
  summary: string
  url: string
}

type RecencyFilter = 'day' | 'week' | 'month' | 'year'

function daysToRecencyFilter(days: number): RecencyFilter {
  if (days <= 1) return 'day'
  if (days <= 7) return 'week'
  if (days <= 30) return 'month'
  return 'year'
}

function sourceFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'News'
  }
}

export async function getStockNews(ticker: string, days = 7): Promise<NewsItem[]> {
  const apiKey = process.env.PERPLEXITY_API_KEY
  if (!apiKey) return []

  const recency = daysToRecencyFilter(days)

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'sonar',
      search_recency_filter: recency,
      messages: [
        {
          role: 'system',
          content: `You are a financial news assistant. Only return news that is specifically and directly about the requested stock ticker and company. Never include news about other companies.`,
        },
        {
          role: 'user',
          content: `Find the 5 most important recent news articles specifically about $${ticker} stock. Only include articles where ${ticker} is the main subject — earnings reports, revenue results, product launches, acquisitions, CEO changes, analyst upgrades/downgrades, lawsuits, or regulatory events. Exclude any articles where ${ticker} is only mentioned in passing.`,
        },
      ],
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error(`[get_news] Perplexity API error ${res.status} for ${ticker}:`, errText)
    return []
  }

  const json = await res.json()
  const searchResults: Array<{
    title: string
    url: string
    date: string
    snippet: string
  }> = json.search_results ?? []

  console.log(`[get_news] ${ticker}: ${searchResults.length} results. Titles:`, searchResults.map(r => r.title))

  if (searchResults.length > 0) {
    return searchResults.slice(0, 5).map((item, i) => ({
      id: String(i),
      title: item.title ?? `${ticker} news`,
      source: sourceFromUrl(item.url),
      date: item.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      summary: item.snippet ?? '',
      url: item.url,
    }))
  }

  // Fallback: parse LLM content if search_results unavailable
  const content: string = json.choices?.[0]?.message?.content ?? ''
  const citations: string[] = json.citations ?? []
  const lines = content.split('\n').filter((l: string) => l.trim())

  return lines.slice(0, 5).map((line: string, i: number) => ({
    id: String(i),
    title: line.replace(/^\d+\.\s*/, '').slice(0, 120),
    source: sourceFromUrl(citations[i] ?? ''),
    date: new Date().toISOString().slice(0, 10),
    summary: '',
    url: citations[i] ?? '',
  }))
}
