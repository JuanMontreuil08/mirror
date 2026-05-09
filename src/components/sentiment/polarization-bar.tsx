type PolarizationBarProps = {
  positiveCount: number
  neutralCount: number
  negativeCount: number
  polarizationLabel: string
}

const POLARIZATION_TEXT: Record<string, string> = {
  consensus:        'Strong consensus — most posts agree.',
  mostly_aligned:   'Mostly aligned — opinions point in a similar direction.',
  divided:          'Divided — meaningful disagreement among posts.',
  strongly_divided: 'Strongly divided — the crowd is split.',
}

export function PolarizationBar({
  positiveCount,
  neutralCount,
  negativeCount,
  polarizationLabel,
}: PolarizationBarProps) {
  const total = positiveCount + neutralCount + negativeCount
  if (total === 0) return null

  const posPct = (positiveCount / total) * 100
  const neuPct = (neutralCount / total) * 100
  const negPct = (negativeCount / total) * 100

  return (
    <div className="glass-card rounded-[20px] p-6">
      <div className="mb-4">
        <h3
          className="font-ui text-base font-medium"
          style={{ color: 'var(--color-text)' }}
        >
          How Divided is the Crowd?
        </h3>
        <p
          className="font-ui text-sm mt-1"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {POLARIZATION_TEXT[polarizationLabel] ?? ''}
        </p>
      </div>

      <div
        className="flex h-8 w-full overflow-hidden rounded-[8px]"
        style={{ gap: '2px' }}
      >
        {posPct > 0 && (
          <div
            className="flex items-center justify-center font-data text-[11px] font-medium"
            style={{
              width: `${posPct}%`,
              backgroundColor: 'var(--color-gain)',
              color: '#09090F',
              borderRadius: '6px',
            }}
          >
            {posPct >= 12 && `${positiveCount}`}
          </div>
        )}
        {neuPct > 0 && (
          <div
            className="flex items-center justify-center font-data text-[11px]"
            style={{
              width: `${neuPct}%`,
              backgroundColor: 'rgba(255,255,255,0.10)',
              color: 'var(--color-text-muted)',
              borderRadius: '6px',
            }}
          >
            {neuPct >= 12 && `${neutralCount}`}
          </div>
        )}
        {negPct > 0 && (
          <div
            className="flex items-center justify-center font-data text-[11px] font-medium"
            style={{
              width: `${negPct}%`,
              backgroundColor: 'var(--color-loss)',
              color: '#09090F',
              borderRadius: '6px',
            }}
          >
            {negPct >= 12 && `${negativeCount}`}
          </div>
        )}
      </div>

      <div className="flex items-center gap-5 mt-3 font-data text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--color-gain)' }} />
          {positiveCount} positive
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.20)' }} />
          {neutralCount} neutral
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--color-loss)' }} />
          {negativeCount} negative
        </span>
      </div>
    </div>
  )
}
