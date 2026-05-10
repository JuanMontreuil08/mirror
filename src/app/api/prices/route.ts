import { NextRequest, NextResponse } from 'next/server'
import { getLatestPrices } from '@/lib/finnhub/client'

export async function GET(req: NextRequest) {
  const tickers = req.nextUrl.searchParams.get('tickers')
  if (!tickers) return NextResponse.json({}, { status: 400 })

  const tickerList = tickers.split(',').map(t => t.trim().toUpperCase()).filter(Boolean)
  if (tickerList.length === 0) return NextResponse.json({}, { status: 400 })

  const prices = await getLatestPrices(tickerList)
  return NextResponse.json(prices)
}
