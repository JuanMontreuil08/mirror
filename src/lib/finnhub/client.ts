const BASE_URL = 'https://finnhub.io/api/v1'

export interface TickerPrice {
  ticker: string
  price: number        // current price
  change: number       // absolute change vs prev close
  changePct: number    // % change vs prev close
  prevClose: number
}

export interface DailyCandle {
  date: string   // YYYY-MM-DD
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export async function getHistoricalPrices(ticker: string, days: number = 7): Promise<DailyCandle[]> {
  const token = process.env.FINNHUB_API_KEY
  if (!token) return []

  const to = Math.floor(Date.now() / 1000)
  const from = to - days * 24 * 60 * 60

  try {
    const res = await fetch(
      `${BASE_URL}/stock/candle?symbol=${ticker}&resolution=D&from=${from}&to=${to}&token=${token}`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return []
    const data = await res.json()
    if (data.s !== 'ok' || !data.t) return []

    return data.t.map((timestamp: number, i: number) => ({
      date: new Date(timestamp * 1000).toISOString().split('T')[0],
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
      volume: data.v[i],
    }))
  } catch {
    return []
  }
}

export async function getLatestPrices(tickers: string[]): Promise<Record<string, TickerPrice>> {
  const token = process.env.FINNHUB_API_KEY
  if (!token || tickers.length === 0) return {}

  const results = await Promise.all(
    tickers.map(async (ticker) => {
      try {
        const res = await fetch(
          `${BASE_URL}/quote?symbol=${ticker}&token=${token}`,
          { next: { revalidate: 3600 } } // cache 1 hour — no real-time needed
        )
        if (!res.ok) return null
        const data = await res.json()
        // Finnhub returns 0 for all fields if ticker is unknown
        if (!data.c || data.c === 0) return null
        return {
          ticker,
          price: data.c,
          change: data.d ?? 0,
          changePct: data.dp ?? 0,
          prevClose: data.pc ?? data.c,
        } satisfies TickerPrice
      } catch {
        return null
      }
    })
  )

  return Object.fromEntries(
    results.filter(Boolean).map((r) => [r!.ticker, r!])
  )
}
