export const MAG_7_TICKERS = ['NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA'] as const
export type Mag7Ticker = typeof MAG_7_TICKERS[number]

export const SUBREDDITS = [
  'stocks',
  'investing',
  'wallstreetbets',
  'SecurityAnalysis',
] as const

export const LOOKBACK_HOURS = 24
export const POSTS_PER_TICKER_LIMIT = 500
export const MIN_POSTS_FOR_SCORE = 5  // lower threshold for mock data (real Reddit will have 100+)
