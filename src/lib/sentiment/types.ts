import type { XPost } from '@/lib/x/types'
import type { SentimentLabel, PolarizationLabel } from './labels'

export type SentimentScore = {
  label: 'positive' | 'neutral' | 'negative'
  score: number       // signed: -1.0 to +1.0
  confidence: number  // 0 to 1
}

export type ScoredPost = XPost & SentimentScore

export type SentimentAggregate = {
  score: number
  label: SentimentLabel
  postCount: number
  positiveCount: number
  neutralCount: number
  negativeCount: number
  polarization: number
  polarizationLabel: PolarizationLabel
  evidencePosts: ScoredPost[]
}
