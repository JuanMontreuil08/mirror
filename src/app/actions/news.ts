'use server'

import { getStockNews, NewsItem } from '@/lib/firecrawl/client'

export async function fetchStockNews(ticker: string): Promise<NewsItem[]> {
  return getStockNews(ticker)
}
