import { scoreToLabel, polarizationToLabel } from './labels'
import { MIN_POSTS_FOR_SCORE } from './constants'
import type { ScoredPost, SentimentAggregate } from './types'

export function aggregate(posts: ScoredPost[]): SentimentAggregate {
  const postCount = posts.length

  if (postCount < MIN_POSTS_FOR_SCORE) {
    return {
      score: 0,
      label: 'low_activity',
      postCount,
      positiveCount: 0,
      neutralCount: 0,
      negativeCount: 0,
      polarization: 0,
      polarizationLabel: 'consensus',
      evidencePosts: posts.slice(0, 5),
    }
  }

  const score = posts.reduce((sum, p) => sum + p.score, 0) / postCount
  const positiveCount = posts.filter(p => p.label === 'positive').length
  const neutralCount = posts.filter(p => p.label === 'neutral').length
  const negativeCount = posts.filter(p => p.label === 'negative').length

  const variance = posts.reduce((sum, p) => sum + Math.pow(p.score - score, 2), 0) / postCount
  const polarization = Math.sqrt(variance)

  return {
    score,
    label: scoreToLabel(score),
    postCount,
    positiveCount,
    neutralCount,
    negativeCount,
    polarization,
    polarizationLabel: polarizationToLabel(polarization),
    evidencePosts: selectEvidence(posts),
  }
}

function selectEvidence(posts: ScoredPost[]): ScoredPost[] {
  const mostPositive = [...posts].sort((a, b) => b.score - a.score).slice(0, 2)
  const mostNegative = [...posts].sort((a, b) => a.score - b.score).slice(0, 2)
  const mostEngaged = [...posts]
    .sort((a, b) => (b.likeCount + b.replyCount) - (a.likeCount + a.replyCount))
    .slice(0, 2)

  const seen = new Set<string>()
  const evidence: ScoredPost[] = []
  for (const list of [mostPositive, mostNegative, mostEngaged]) {
    for (const p of list) {
      if (!seen.has(p.id) && evidence.length < 6) {
        seen.add(p.id)
        evidence.push(p)
      }
    }
  }
  return evidence
}
