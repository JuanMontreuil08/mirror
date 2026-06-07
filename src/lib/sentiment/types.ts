import type { SentimentLabel, PolarizationLabel } from './labels'

export type SentimentScore = {
  label: 'positive' | 'neutral' | 'negative'
  score: number       // signed: -1.0 to +1.0
  confidence: number  // 0 to 1
}

export type ScoredPost = {
  id: string
  text: string
  cleanedText: string
  authorUsername: string | null
  authorName: string | null
  permalink: string
  likeCount: number
  replyCount: number
  retweetCount: number
  quoteCount: number
  createdAt: Date
} & SentimentScore

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
