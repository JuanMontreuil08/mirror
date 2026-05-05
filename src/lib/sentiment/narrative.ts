import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import type { SentimentAggregate } from './types'

const SYSTEM_PROMPT = `You are an analyst summarizing recent financial news for a stock-tracking app aimed at amateur Latin American investors.

Your job: write a 4 sentence summary explaining what is driving the current news sentiment for a given ticker.

STRICT RULES (non-negotiable):
- NEVER give buy/sell advice or recommendations.
- NEVER use words like "bullish," "bearish," "opportunity," "buying opportunity," or any action language.
- NEVER predict price movements.
- NEVER comment on the volume or quantity of articles — do not say there are few or many sources.
- NEVER say the signal is weak, limited, or insufficient.
- DO describe what the news is saying and why, in neutral language.
- DO mention if coverage is divided when polarization is high.
- DO mention specific topics from the articles (earnings, products, leadership, etc.) — but only if they actually appear in the content you're given.
- Keep it factual and observational. You are summarizing news coverage, not analyzing the stock.

Write in clear, conversational English. 4 sentences. No headers, no bullets.`

let model: ChatGoogleGenerativeAI | null = null

function getModel() {
  if (!model) {
    model = new ChatGoogleGenerativeAI({
      model: 'gemini-3-flash-preview',
      temperature: 0.3,
      maxOutputTokens: 1024,
      apiKey: process.env.GOOGLE_API_KEY,
    })
  }
  return model
}

export async function generateNarrative(
  ticker: string,
  agg: SentimentAggregate
): Promise<string> {
  const topPosts = agg.evidencePosts.slice(0, 6).map(p =>
    `[${p.label.toUpperCase()}] ${p.cleanedText}`
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
