import { createClient } from '@/lib/supabase/server'
import { Position, Transaction } from '@/types'
import ChatInterface from '@/components/chat-interface'
import { getLatestPrices, TickerPrice } from '@/lib/finnhub/client'

function getSuggestedQuestions(
  positions: Position[],
  prices: Record<string, TickerPrice>
): { text: string; icon: string }[] {
  if (positions.length === 0) {
    return [
      { text: 'How do I get started with investing?', icon: '📚' },
      { text: "What's happening in the market today?", icon: '📊' },
    ]
  }

  const results: { text: string; icon: string }[] = []
  const used = new Set<string>()

  const totalCurrentValue = positions.reduce((sum, p) => {
    const pr = prices[p.ticker]
    return sum + (pr ? pr.price * Number(p.quantity) : Number(p.total_invested))
  }, 0)

  const enriched = positions
    .filter(p => prices[p.ticker])
    .map(p => {
      const currentPrice = prices[p.ticker].price
      const avgBuyPrice = Number(p.avg_buy_price)
      const pnlPct = avgBuyPrice > 0 ? ((currentPrice - avgBuyPrice) / avgBuyPrice) * 100 : 0
      const weight = totalCurrentValue > 0 ? (currentPrice * Number(p.quantity)) / totalCurrentValue * 100 : 0
      return { ticker: p.ticker, pnlPct, weight, createdAt: p.created_at }
    })

  if (enriched.length > 0) {
    const sorted = [...enriched].sort((a, b) => b.pnlPct - a.pnlPct)

    const gainer = sorted[0]
    if (gainer.pnlPct > 1) {
      results.push({ text: `Your ${gainer.ticker} is up ${Math.abs(gainer.pnlPct).toFixed(0)}% — what's driving it?`, icon: '📈' })
      used.add(gainer.ticker)
    }

    const loser = sorted[sorted.length - 1]
    if (loser.pnlPct < -1 && !used.has(loser.ticker)) {
      results.push({ text: `${loser.ticker} is down ${Math.abs(loser.pnlPct).toFixed(0)}% — what happened?`, icon: '📉' })
      used.add(loser.ticker)
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const recent = positions
      .filter(p => p.created_at >= sevenDaysAgo && !used.has(p.ticker))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
    if (recent) {
      results.push({ text: `You just added ${recent.ticker} — how is it doing?`, icon: '🆕' })
      used.add(recent.ticker)
    }

    if (results.length < 4) {
      const heaviest = [...enriched].filter(p => !used.has(p.ticker)).sort((a, b) => b.weight - a.weight)[0]
      if (heaviest) {
        results.push({ text: `${heaviest.ticker} is your biggest position — what's the latest?`, icon: '⚖️' })
      }
    }
  }

  const fallbacks = [
    { text: 'How is my portfolio doing today?', icon: '📊' },
    { text: "What's the latest news on my stocks?", icon: '📰' },
  ]
  for (const fb of fallbacks) {
    if (results.length >= 4) break
    results.push(fb)
  }

  return results.slice(0, 4)
}

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
      const newFees = Number(existing.total_fees ?? 0) + Number(p.total_fees ?? 0)
      positionMap.set(p.ticker, {
        ...existing,
        quantity: newQty,
        total_invested: newTotal,
        total_fees: newFees,
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

  const suggestedQuestions = getSuggestedQuestions(positions, prices)

  return (
    <ChatInterface
      portfolioContext={portfolioContext}
      userEmail={user!.email ?? ''}
      positions={positions}
      prices={prices}
      totalInvested={totalInvested}
      suggestedQuestions={suggestedQuestions}
    />
  )
}
