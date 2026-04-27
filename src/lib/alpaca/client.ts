const DATA_BASE_URL = 'https://data.alpaca.markets/v2'

export interface DailyCandle {
  date: string  // YYYY-MM-DD
  open: number
  high: number
  low: number
  close: number
  volume: number
  vwap: number
}

/**
 * Get historical daily bars for a stock ticker from Alpaca Markets.
 * Uses the IEX feed (free tier) — covers all NYSE/NASDAQ stocks.
 * Historical data is fully available regardless of the 15-min delay.
 *
 * @param ticker - Stock symbol e.g. "NFLX"
 * @param days   - Number of calendar days to look back (default 7)
 */
export async function getHistoricalPrices(
  ticker: string,
  days: number = 7
): Promise<DailyCandle[]> {
  const apiKey = process.env.ALPACA_API_KEY
  const apiSecret = process.env.ALPACA_API_SECRET

  if (!apiKey || !apiSecret) {
    console.error('[alpaca] Missing ALPACA_API_KEY or ALPACA_API_SECRET')
    return []
  }

  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)

  const params = new URLSearchParams({
    timeframe: '1Day',
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
    adjustment: 'split',  // corrects for stock splits (NVDA, TSLA, etc.)
    feed: 'iex',          // required for free tier
    sort: 'asc',
    limit: '1000',
  })

  try {
    const res = await fetch(
      `${DATA_BASE_URL}/stocks/${ticker}/bars?${params}`,
      {
        headers: {
          'APCA-API-KEY-ID': apiKey,
          'APCA-API-SECRET-KEY': apiSecret,
        },
        next: { revalidate: 3600 },
      }
    )

    if (!res.ok) {
      const err = await res.text()
      console.error(`[alpaca] bars failed for ${ticker}: ${res.status}`, err)
      return []
    }

    const data = await res.json()
    const bars: Array<{ t: string; o: number; h: number; l: number; c: number; v: number; vw: number }> =
      data.bars ?? []

    return bars.map((bar) => ({
      date: bar.t.split('T')[0],
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
      vwap: bar.vw,
    }))
  } catch (err) {
    console.error(`[alpaca] unexpected error for ${ticker}:`, err)
    return []
  }
}
