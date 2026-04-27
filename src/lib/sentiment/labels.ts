export type SentimentLabel =
  | 'positive'
  | 'mostly_positive'
  | 'mixed'
  | 'mostly_negative'
  | 'negative'
  | 'low_activity'

export function scoreToLabel(score: number): SentimentLabel {
  if (score > 0.4) return 'positive'
  if (score > 0.1) return 'mostly_positive'
  if (score > -0.1) return 'mixed'
  if (score > -0.4) return 'mostly_negative'
  return 'negative'
}

export type PolarizationLabel = 'consensus' | 'mostly_aligned' | 'divided' | 'strongly_divided'

export function polarizationToLabel(polarization: number): PolarizationLabel {
  if (polarization < 0.2) return 'consensus'
  if (polarization < 0.4) return 'mostly_aligned'
  if (polarization < 0.6) return 'divided'
  return 'strongly_divided'
}
