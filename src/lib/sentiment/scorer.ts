import { InferenceClient } from '@huggingface/inference'
import type { SentimentScore } from './types'

export interface SentimentScorer {
  scoreBatch(texts: string[]): Promise<SentimentScore[]>
}

class FinBertScorer implements SentimentScorer {
  private client = new InferenceClient(process.env.HUGGINGFACE_API_KEY!)
  private model = 'ProsusAI/finbert'

  async scoreBatch(texts: string[]): Promise<SentimentScore[]> {
    const truncated = texts.map(t => t.slice(0, 1500))
    const CONCURRENCY = 8
    const results: SentimentScore[] = []

    for (let i = 0; i < truncated.length; i += CONCURRENCY) {
      const chunk = truncated.slice(i, i + CONCURRENCY)
      const chunkResults = await Promise.all(
        chunk.map(text =>
          this.client.textClassification({
            model: this.model,
            inputs: text,
            provider: 'hf-inference',
          })
        )
      )

      for (const result of chunkResults) {
        const top = result.reduce((a, b) => (a.score > b.score ? a : b))
        const label = top.label.toLowerCase() as 'positive' | 'neutral' | 'negative'
        const score =
          label === 'positive' ? top.score :
          label === 'negative' ? -top.score :
          0
        results.push({ label, score, confidence: top.score })
      }
    }

    return results
  }
}

export const sentimentScorer: SentimentScorer = new FinBertScorer()
