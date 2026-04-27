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
    <div className="rounded-lg border border-gray-100 bg-white p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">How Divided is the Crowd?</h3>
        <p className="text-sm text-gray-500 mt-1">
          {POLARIZATION_TEXT[polarizationLabel] ?? ''}
        </p>
      </div>

      <div className="flex h-9 w-full overflow-hidden rounded-md">
        {posPct > 0 && (
          <div
            className="bg-green-500 flex items-center justify-center text-xs font-medium text-white"
            style={{ width: `${posPct}%` }}
          >
            {posPct >= 10 && `${positiveCount}`}
          </div>
        )}
        {neuPct > 0 && (
          <div
            className="bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600"
            style={{ width: `${neuPct}%` }}
          >
            {neuPct >= 10 && `${neutralCount}`}
          </div>
        )}
        {negPct > 0 && (
          <div
            className="bg-red-500 flex items-center justify-center text-xs font-medium text-white"
            style={{ width: `${negPct}%` }}
          >
            {negPct >= 10 && `${negativeCount}`}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
          {positiveCount} positive
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-gray-300" />
          {neutralCount} neutral
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
          {negativeCount} negative
        </span>
      </div>
    </div>
  )
}
