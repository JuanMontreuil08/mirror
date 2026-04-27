import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import type { SentimentAggregate } from './types'

const SYSTEM_PROMPT = `You are an analyst summarizing online retail-investor chatter for a stock-tracking app aimed at amateur Latin American investors.

Your job: write a 2–3 sentence summary explaining what is driving today's Reddit sentiment for a given ticker.

STRICT RULES (non-negotiable):
- NEVER give buy/sell advice or recommendations.
- NEVER use words like "bullish," "bearish," "opportunity," "buying opportunity," or any action language.
- NEVER predict price movements.
- DO describe what people are saying and why, in neutral language.
- DO mention if opinions are divided when polarization is high.
- DO mention specific topics from the posts (earnings, products, leadership, etc.) — but only if they actually appear in the posts you're given.
- If post count is low, say so directly: "Reddit activity for this ticker is low right now, so the signal is weak."
- Keep it factual and observational. You are describing chatter, not analyzing the stock.

Write in clear, conversational English. 2–3 sentences. No headers, no bullets.`

let model: ChatGoogleGenerativeAI | null = null

function getModel() {
  if (!model) {
    model = new ChatGoogleGenerativeAI({
      model: 'gemini-3-flash-preview',
      temperature: 0.3,
      maxOutputTokens: 200,
      apiKey: process.env.GOOGLE_API_KEY,
    })
  }
  return model
}

export async function generateNarrative(
  ticker: string,
  agg: SentimentAggregate
): Promise<string> {
  if (agg.label === 'low_activity') {
    return `Reddit activity for ${ticker} is low right now (${agg.postCount} posts in the last 24 hours). The current signal is weak — wait for more discussion before drawing conclusions.`
  }

  const topPosts = agg.evidencePosts.slice(0, 6).map(p =>
    `[${p.label.toUpperCase()}] ${p.title}${p.body ? ` — ${p.body.slice(0, 200)}` : ''}`
  ).join('\n')

  const userPrompt = `Ticker: ${ticker}
Overall sentiment: ${agg.label.replace(/_/g, ' ')} (score ${agg.score.toFixed(2)})
Post count: ${agg.postCount}
Distribution: ${agg.positiveCount} positive, ${agg.neutralCount} neutral, ${agg.negativeCount} negative
Polarization: ${agg.polarizationLabel.replace(/_/g, ' ')}

Representative posts:
${topPosts}

Write the 2–3 sentence summary now.`

  const response = await getModel().invoke([
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage(userPrompt),
  ])

  return (response.content as string).trim()
}
