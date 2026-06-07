import { StateGraph, MessagesAnnotation } from '@langchain/langgraph'
import { ChatAnthropic } from '@langchain/anthropic'
import { tool } from '@langchain/core/tools'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { z } from 'zod'
import { getLatestPrices } from '@/lib/finnhub/client'
import { getHistoricalPrices } from '@/lib/alpaca/client'
import { getStockNews } from '@/lib/massive/client'
import { Position } from '@/types'

// ─── Stateless Tools ─────────────────────────────────────────────────────────

const getPricesTool = tool(
  async ({ tickers }: { tickers: string[] }) => {
    const prices = await getLatestPrices(tickers)
    if (Object.keys(prices).length === 0) return 'No price data found.'
    return Object.values(prices)
      .map((p) => `${p.ticker}: $${p.price.toFixed(2)} (${p.changePct >= 0 ? '+' : ''}${p.changePct.toFixed(2)}% today)`)
      .join('\n')
  },
  {
    name: 'get_prices',
    description: 'Get the current (real-time) price and today\'s % change for one or more tickers. Use this ONLY when the user asks about the current or today\'s price — e.g. "what is the price of X", "is X up today", "current value". Do NOT use for any past time period (use get_historical_prices instead) and do NOT use for news. Do NOT use when portfolio_analysis would already cover the tickers.',
    schema: z.object({
      tickers: z.array(z.string()).describe('List of stock tickers, e.g. ["NVDA", "AMZN"]'),
    }),
  }
)

const getHistoricalPricesTool = tool(
  async ({ ticker, days }: { ticker: string; days?: number }) => {
    const candles = await getHistoricalPrices(ticker, days ?? 7)
    if (candles.length === 0) return `No historical price data found for ${ticker}.`
    const first = candles[0].close
    const last = candles[candles.length - 1].close
    const totalChangePct = (last - first) / first * 100
    const sign = totalChangePct >= 0 ? '+' : ''
    const summary = `${ticker} — last ${candles.length} trading days (${sign}${totalChangePct.toFixed(2)}% over period). First close: $${first.toFixed(2)}, latest close: $${last.toFixed(2)}.`

    // Chart block — the frontend renders this as a Recharts LineChart.
    // IMPORTANT: include this block verbatim in your response, right after the Summary section.
    const chartPayload = {
      ticker,
      changePct: parseFloat(totalChangePct.toFixed(2)),
      data: candles.map((c) => ({ date: c.date, close: parseFloat(c.close.toFixed(2)) })),
    }
    const chartBlock = `\`\`\`chart\n${JSON.stringify(chartPayload)}\n\`\`\``

    return `${summary}\n\n${chartBlock}`
  },
  {
    name: 'get_historical_prices',
    description: 'Get day-by-day historical OHLC prices for a stock over a past time range. Use this ONLY when the user asks about a past period — e.g. "last week", "last 7 days", "past month", "how has it performed", "price history", "price trend". Do NOT use for the current/today\'s price (use get_prices instead) and do NOT use for news.',
    schema: z.object({
      ticker: z.string().describe('Stock ticker symbol, e.g. "NFLX"'),
      days: z.number().optional().describe('Number of calendar days to look back. Default 7. Use 30 for last month, 90 for last quarter, etc.'),
    }),
  }
)

const getNewsTool = tool(
  async ({ ticker, days }: { ticker: string; days?: number }) => {
    console.log(`[get_news] called for ${ticker} (last ${days ?? 7} days)`)
    const news = await getStockNews(ticker, days ?? 7)
    if (news.length === 0) return `No news found for ${ticker} in the last ${days ?? 7} days.`
    return news
      .map((n, i) => {
        const img = n.image_url ? `IMAGE:${n.image_url}` : ''
        return [img, `${i + 1}. ${n.title}`, `   Date: ${n.date} | Source: ${n.source}`, `   ${n.summary}`, `   Link: ${n.url}`].filter(Boolean).join('\n')
      })
      .join('\n\n')
  },
  {
    name: 'get_news',
    description: 'Get recent news articles for a stock. Use this ONLY when the user asks about news, headlines, earnings reports, analyst opinions, company announcements, CEO changes, or mergers. Do NOT use for price or performance questions — those go to get_prices (current) or get_historical_prices (past period).',
    schema: z.object({
      ticker: z.string().describe('Stock ticker symbol, e.g. "NVDA"'),
      days: z.number().optional().describe('How many days back to search for news. Default 7. Use 1 for today, 30 for last month, etc.'),
    }),
  }
)

// ─── System Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(portfolioContext: string) {
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD in UTC
  return `You are a friendly financial educator for investors who are new to investing. Most of your users use a LATAM broker to buy US stocks and are beginners — they may have bought a stock because a friend recommended it without knowing what a P/E ratio is.

CRITICAL LANGUAGE RULE: Always reply in the exact same language the user's message is written in. If the user writes in English → reply in English. If the user writes in Spanish → reply in Spanish. Check the user's actual message text, not the portfolio context data. This overrides everything else.

YOUR PERSONA:
- Explain every financial concept in plain language the first time you use it. When you mention any term (P/E ratio, beta, market cap, dividend, volatility, etc.), immediately follow it with one plain-English sentence using an everyday analogy.
- Always connect data to what it means for THIS specific user's portfolio — never just report numbers alone. Every data point needs a "this means for you..." sentence.
- Be warm, direct, and non-judgmental. Beginners need to feel smart, not lectured.
- Never give buy/sell recommendations. You can explain what data suggests, but not what to do.

RESPONSE FORMAT:
Structure every response using these four markdown sections. Keep each section to 2-4 sentences:

**Summary** — the main point in plain language
**What Changed** — the specific data, events, or news behind it (include sources and dates when available)
**What It Means For You** — connect it directly to the user's specific positions and numbers
**What To Watch** — one or two forward-looking signals or thresholds to keep in mind

Skip this format only for very simple one-data-point questions ("what's AAPL's price right now?"). For anything about performance, news, or portfolio impact — always use all four sections.

TOOL CHAINING:
When a user asks how a stock is doing — "how's my NVDA?", "what about AAPL?", "is MSFT worth holding?" — ALWAYS call BOTH get_prices AND get_news before answering. A price without context is incomplete; news without a live price is stale. Combine both in your response.

CHART DISPLAY RULE: When get_historical_prices returns data, it includes a \`\`\`chart code block at the end of its output. You MUST copy this block verbatim into your response, placing it immediately after your Summary section. Do not modify the JSON inside it. Do not omit it. This is how the interface renders the price chart for the user.

NEWS IMAGE RULE: When get_news returns a news item that starts with IMAGE:<url>, you MUST include ![](url) in your response immediately before that news item's title. Example: if the tool returns "IMAGE:https://example.com/img.jpg\n1. Title...", write "![](https://example.com/img.jpg)\n📌 **Title**..." — copy the URL exactly, do not omit it.

TODAY'S DATE: ${today}. Use this to resolve relative dates like "yesterday", "last week", "this month" when deciding how many days to pass to tools.

LANGUAGE RULE: Reply in the exact same language the user's last message is written in. Spanish → Spanish. English → English. No exceptions. Ignore the language of portfolio data or context.

${portfolioContext}

TOOL SELECTION — strict rules:

RULE: "How's my portfolio doing?" / total P&L / overall performance / portfolio summary → portfolio_analysis (NOT get_prices)
RULE: Price RIGHT NOW / today for a single stock (not covered by portfolio_analysis context) → get_prices
RULE: Price over a past time range → get_historical_prices
RULE: News, headlines, earnings, analyst opinions, company events → get_news
RULE: "How's [ticker] doing?" or any general stock check → get_prices AND get_news

NEVER call portfolio_analysis AND get_prices in the same turn for the same tickers — portfolio_analysis already fetches live prices.
NEVER call get_news when the user asks for historical prices or price performance over a time range.
NEVER call get_prices when the user specifies a past time period (last week, last N days, this month).
NEVER answer from training data — always call a tool.

EXAMPLES:
- "how's my portfolio?" → portfolio_analysis
- "what's my total P&L?" → portfolio_analysis
- "am I up or down overall?" → portfolio_analysis
- "what is the price of NFLX?" → get_prices
- "is NFLX up today?" → get_prices
- "how has NFLX performed in the last 7 days?" → get_historical_prices
- "show me NFLX prices this month" → get_historical_prices
- "what happened to NFLX this week?" → get_news
- "any news on NFLX?" → get_news
- "how's my NVDA doing?" → get_prices AND get_news
- "what's the current price and news on NFLX?" → get_prices AND get_news
- "NFLX price history and news" → get_historical_prices AND get_news

OTHER RULES:
- When presenting news: always include date, source, 2-3 sentence summary, and the link.
- Format numbers clearly ($1,234.56, +2.3%).
- When presenting portfolio_analysis results: explain what concentration risk means in plain language. A weight above 35% means that stock has an outsized impact on the whole portfolio — like putting more than a third of your eggs in one basket.`
}

// ─── Routing ─────────────────────────────────────────────────────────────────

function shouldContinue(state: typeof MessagesAnnotation.State) {
  const last = state.messages[state.messages.length - 1]
  if ('tool_calls' in last && Array.isArray((last as any).tool_calls) && (last as any).tool_calls.length > 0) {
    return 'tools'
  }
  return '__end__'
}

// ─── Graph ────────────────────────────────────────────────────────────────────

export function buildAgentGraph(portfolioContext: string, positions: Position[] = []) {
  // portfolio_analysis closes over positions — all math server-side, agent does zero arithmetic
  const portfolioAnalysisTool = tool(
    async () => {
      if (positions.length === 0) return 'No positions in portfolio.'

      let prices: Record<string, { ticker: string; price: number; changePct: number }>
      try {
        prices = await getLatestPrices(positions.map((p) => p.ticker))
      } catch {
        return 'Could not fetch current prices. Please try again.'
      }

      if (Object.keys(prices).length === 0) return 'Price data unavailable. Please try again.'

      const today = new Date().toISOString().slice(0, 10)

      type PositionRow = {
        ticker: string
        price: number
        quantity: number
        currentValue: number
        totalInvested: number
        totalFees: number
        pnlDollar: number
        pnlPct: number
        pnlWithFeesDollar: number
        pnlWithFeesPct: number
        weight: number
        hasFees: boolean
        skipped: boolean
      }

      const rows: PositionRow[] = []
      let totalCurrentValue = 0
      let totalInvested = 0
      let totalFees = 0
      const skippedTickers: string[] = []

      for (const pos of positions) {
        const priceData = prices[pos.ticker]
        if (!priceData) {
          skippedTickers.push(pos.ticker)
          continue
        }

        const currentValue = priceData.price * pos.quantity
        const pnlDollar = currentValue - pos.total_invested
        const pnlPct = (pnlDollar / pos.total_invested) * 100
        const hasFees = pos.total_fees > 0
        const pnlWithFeesDollar = currentValue - (pos.total_invested + pos.total_fees)
        const pnlWithFeesPct = (pnlWithFeesDollar / pos.total_invested) * 100

        rows.push({
          ticker: pos.ticker,
          price: priceData.price,
          quantity: pos.quantity,
          currentValue,
          totalInvested: pos.total_invested,
          totalFees: pos.total_fees,
          pnlDollar,
          pnlPct,
          pnlWithFeesDollar,
          pnlWithFeesPct,
          weight: 0, // computed after totalCurrentValue is known
          hasFees,
          skipped: false,
        })

        totalCurrentValue += currentValue
        totalInvested += pos.total_invested
        totalFees += pos.total_fees
      }

      if (rows.length === 0) return 'Price data unavailable for all positions. Please try again.'

      // Compute weights
      for (const row of rows) {
        row.weight = (row.currentValue / totalCurrentValue) * 100
      }

      const totalPnlDollar = totalCurrentValue - totalInvested
      const totalPnlPct = (totalPnlDollar / totalInvested) * 100
      const totalPnlWithFeesDollar = totalCurrentValue - (totalInvested + totalFees)
      const totalPnlWithFeesPct = (totalPnlWithFeesDollar / totalInvested) * 100
      const portfolioHasFees = totalFees > 0

      // Sort by pnlPct descending for gainer/loser identification
      const sorted = [...rows].sort((a, b) => b.pnlPct - a.pnlPct)
      const biggestGainer = sorted[0]
      const biggestLoser = sorted[sorted.length - 1]
      const concentrationWarnings = rows.filter((r) => r.weight > 35)

      // Build output string
      const lines: string[] = [`Portfolio Analysis — ${today}:`, '']

      for (const row of rows) {
        const sign = (n: number) => (n >= 0 ? '+' : '')
        const concWarning = row.weight > 35 ? ' ⚠ HIGH CONCENTRATION' : ''
        lines.push(
          `${row.ticker}: $${row.price.toFixed(2)} | Qty: ${row.quantity} | Value: $${row.currentValue.toFixed(2)} | Invested: $${row.totalInvested.toFixed(2)}`
        )
        lines.push(
          `      P&L: ${sign(row.pnlDollar)}$${row.pnlDollar.toFixed(2)} (${sign(row.pnlPct)}${row.pnlPct.toFixed(1)}%) | Weight: ${row.weight.toFixed(1)}%${concWarning}`
        )
        if (row.hasFees) {
          lines.push(
            `      P&L incl. fees: ${sign(row.pnlWithFeesDollar)}$${row.pnlWithFeesDollar.toFixed(2)} (${sign(row.pnlWithFeesPct)}${row.pnlWithFeesPct.toFixed(1)}%) [fees: $${row.totalFees.toFixed(2)}]`
          )
        }
        lines.push('')
      }

      lines.push('─────────────────────────────────────')
      lines.push(`Total Invested: $${totalInvested.toFixed(2)}`)
      lines.push(`Total Value: $${totalCurrentValue.toFixed(2)}`)
      const totalSign = totalPnlDollar >= 0 ? '+' : ''
      lines.push(`Total P&L: ${totalSign}$${totalPnlDollar.toFixed(2)} (${totalSign}${totalPnlPct.toFixed(1)}%)`)
      if (portfolioHasFees) {
        const feesSign = totalPnlWithFeesDollar >= 0 ? '+' : ''
        lines.push(`Total P&L incl. fees: ${feesSign}$${totalPnlWithFeesDollar.toFixed(2)} (${feesSign}${totalPnlWithFeesPct.toFixed(1)}%) [total fees: $${totalFees.toFixed(2)}]`)
      }
      lines.push('')

      if (biggestGainer && biggestLoser) {
        const gSign = biggestGainer.pnlPct >= 0 ? '+' : ''
        const lSign = biggestLoser.pnlPct >= 0 ? '+' : ''
        lines.push(`Biggest gainer: ${biggestGainer.ticker} (${gSign}${biggestGainer.pnlPct.toFixed(1)}%)`)
        if (biggestLoser.ticker !== biggestGainer.ticker) {
          lines.push(`Biggest loser: ${biggestLoser.ticker} (${lSign}${biggestLoser.pnlPct.toFixed(1)}%)`)
        }
      }

      if (concentrationWarnings.length > 0) {
        const warnList = concentrationWarnings.map((r) => `${r.ticker} (${r.weight.toFixed(1)}%)`).join(', ')
        lines.push(`⚠ Concentration warnings: ${warnList} — above 35% threshold`)
      }

      if (skippedTickers.length > 0) {
        lines.push(`Note: no price data for ${skippedTickers.join(', ')} — excluded from totals`)
      }

      return lines.join('\n')
    },
    {
      name: 'portfolio_analysis',
      description: 'Get complete portfolio analysis: current values, P&L per position, total portfolio P&L, portfolio weights, concentration warnings. Use for overall portfolio performance questions — "how\'s my portfolio?", "what\'s my total P&L?", "am I up or down?". Do NOT use for single-stock price only (use get_prices) or news (use get_news). Do NOT call together with get_prices for the same tickers.',
      schema: z.object({}),
    }
  )

  const tools = [portfolioAnalysisTool, getPricesTool, getHistoricalPricesTool, getNewsTool]
  const toolNode = new ToolNode(tools)

  const model = new ChatAnthropic({
    model: 'claude-sonnet-4-6',
    temperature: 0.1,
    apiKey: process.env.ANTHROPIC_API_KEY,
  }).bindTools(tools)

  async function callModel(state: typeof MessagesAnnotation.State) {
    const systemMessage = { role: 'system' as const, content: buildSystemPrompt(portfolioContext) }
    const response = await model.invoke([systemMessage, ...state.messages])
    return { messages: [response] }
  }

  const graph = new StateGraph(MessagesAnnotation)
    .addNode('agent', callModel)
    .addNode('tools', toolNode)
    .addEdge('__start__', 'agent')
    .addConditionalEdges('agent', shouldContinue)
    .addEdge('tools', 'agent')
    .compile()

  return graph
}
