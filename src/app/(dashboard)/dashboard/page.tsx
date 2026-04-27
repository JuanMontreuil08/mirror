import { createClient } from '@/lib/supabase/server'
import { Position, Transaction } from '@/types'
import ChatInterface from '@/components/chat-interface'
import { getLatestPrices } from '@/lib/finnhub/client'
import { TickerPrice } from '@/lib/finnhub/client'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: rawPositions }, { data: transactions }] = await Promise.all([
    supabase.from('positions').select('*').eq('user_id', user!.id).eq('is_active', true),
    supabase.from('transactions').select('*').eq('user_id', user!.id).order('transaction_date', { ascending: false }),
  ])

  // Aggregate duplicate rows per ticker
  const positionMap = new Map<string, Position>()
  for (const p of (rawPositions ?? []) as Position[]) {
    const existing = positionMap.get(p.ticker)
    if (!existing) {
      positionMap.set(p.ticker, { ...p })
    } else {
      const newQty = Number(existing.quantity) + Number(p.quantity)
      const newTotal = Number(existing.total_invested) + Number(p.total_invested)
      positionMap.set(p.ticker, {
        ...existing,
        quantity: newQty,
        total_invested: newTotal,
        avg_buy_price: newTotal / newQty,
      })
    }
  }
  const positions = Array.from(positionMap.values()).sort(
    (a, b) => Number(b.total_invested) - Number(a.total_invested)
  )

  const totalInvested = positions.reduce((sum, p) => sum + Number(p.total_invested), 0)

  // Build portfolio context string for the agent's system prompt
  const portfolioContext = positions.length === 0
    ? 'The user has no positions yet. Encourage them to upload a voucher to get started.'
    : [
        `The user's portfolio has ${positions.length} positions with a total invested of $${totalInvested.toFixed(2)}:`,
        ...positions.map((p) => {
          const weight = ((Number(p.total_invested) / totalInvested) * 100).toFixed(1)
          return `- ${p.ticker}: ${Number(p.quantity).toFixed(4)} shares, avg buy price $${Number(p.avg_buy_price).toFixed(2)}, total invested $${Number(p.total_invested).toFixed(2)} (${weight}% of portfolio)`
        }),
        '',
        'Recent transactions:',
        ...((transactions ?? []) as Transaction[]).slice(0, 20).map((tx) =>
          `- ${tx.transaction_date} ${tx.transaction_type.toUpperCase()} ${Number(tx.quantity).toFixed(4)} ${tx.ticker} @ $${Number(tx.price_per_share).toFixed(2)}`
        ),
      ].join('\n')

  const tickers = positions.map((p) => p.ticker)
  const prices: Record<string, TickerPrice> = tickers.length > 0
    ? await getLatestPrices(tickers).catch(() => ({}))
    : {}

  return (
    <ChatInterface
      portfolioContext={portfolioContext}
      userEmail={user!.email ?? ''}
      positions={positions}
      prices={prices}
      totalInvested={totalInvested}
    />
  )
}
