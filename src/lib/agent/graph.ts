import { StateGraph, MessagesAnnotation } from '@langchain/langgraph'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { tool } from '@langchain/core/tools'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { z } from 'zod'
import { getLatestPrices } from '@/lib/finnhub/client'
import { getHistoricalPrices } from '@/lib/alpaca/client'
import { getStockNews } from '@/lib/perplexity/client'

// ─── Tools ───────────────────────────────────────────────────────────────────

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
    description: 'Get the current (real-time) price and today\'s % change for one or more tickers. Use this ONLY when the user asks about the current or today\'s price — e.g. "what is the price of X", "is X up today", "current value". Do NOT use for any past time period (use get_historical_prices instead) and do NOT use for news.',
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
    const header = `${ticker} — last ${candles.length} trading days (${sign}${totalChangePct.toFixed(2)}% over period):`
    const rows = candles
      .map((c) => `  ${c.date}: open $${c.open.toFixed(2)} | close $${c.close.toFixed(2)} | high $${c.high.toFixed(2)} | low $${c.low.toFixed(2)} | vwap $${c.vwap.toFixed(2)}`)
      .join('\n')
    return `${header}\n${rows}`
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
      .map((n, i) => `${i + 1}. ${n.title}\n   Date: ${n.date} | Source: ${n.source}\n   ${n.summary}\n   Link: ${n.url}`)
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

// ─── Graph ────────────────────────────────────────────────────────────────────

const tools = [getPricesTool, getHistoricalPricesTool, getNewsTool]
const toolNode = new ToolNode(tools)

function buildModel() {
  return new ChatGoogleGenerativeAI({
    model: 'gemini-3-flash-preview',
    temperature: 0.3,
    apiKey: process.env.GOOGLE_API_KEY,
  }).bindTools(tools)
}

function buildSystemPrompt(portfolioContext: string) {
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD in UTC
  return `You are a friendly personal investment assistant for a Latin American retail investor.
You have access to the user's portfolio data and can fetch live and historical prices, and stock news.

TODAY'S DATE: ${today}. Use this to resolve relative dates like "yesterday", "last week", "this month" when deciding how many days to pass to tools.

LANGUAGE RULE: You MUST reply in the exact same language the user writes in. If the user writes in English, reply in English. If the user writes in Spanish, reply in Spanish. No exceptions.

${portfolioContext}

TOOL SELECTION — strict rules with examples:

RULE: Any question about price numbers over a past time range → get_historical_prices. No exceptions.
RULE: Any question about the price RIGHT NOW / today → get_prices.
RULE: Any question about articles, headlines, company events, earnings → get_news.

EXAMPLES (memorize these patterns):
- "what is the price of NFLX?" → get_prices
- "is NFLX up today?" → get_prices
- "give me historical prices for NFLX last week" → get_historical_prices
- "how has NFLX performed in the last 7 days?" → get_historical_prices
- "show me NFLX prices this month" → get_historical_prices
- "what happened to NFLX this week?" → get_news
- "any news on NFLX?" → get_news
- "NFLX earnings?" → get_news
- "what is the current price and any news on NFLX?" → get_prices AND get_news
- "NFLX price history and news" → get_historical_prices AND get_news

NEVER call get_news when the user asks for historical prices or price performance over a time range.
NEVER call get_prices when the user specifies a past time period (last week, last N days, this month).
NEVER answer from training data — always call a tool.

OTHER RULES:
- When presenting news: always include date, source, 2-3 sentence summary, and the link.
- Format numbers clearly ($1,234.56, +2.3%).
- Never give buy/sell recommendations.`
}

function shouldContinue(state: typeof MessagesAnnotation.State) {
  const last = state.messages[state.messages.length - 1]
  if ('tool_calls' in last && Array.isArray((last as any).tool_calls) && (last as any).tool_calls.length > 0) {
    return 'tools'
  }
  return '__end__'
}

export function buildAgentGraph(portfolioContext: string) {
  const model = buildModel()

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
