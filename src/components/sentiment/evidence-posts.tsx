type XEvidencePost = {
  id: string
  text: string
  author_username: string | null
  author_name: string | null
  permalink: string
  like_count: number
  reply_count: number
  posted_at: string
  sentiment_label: string
}

const SENTIMENT_BADGE: Record<string, string> = {
  positive: 'bg-green-100 text-green-800',
  neutral:  'bg-gray-100 text-gray-600',
  negative: 'bg-red-100 text-red-800',
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function EvidencePosts({ posts }: { posts: XEvidencePost[] }) {
  if (posts.length === 0) return null

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Posts Driving Sentiment</h3>
        <p className="text-sm text-gray-500 mt-1">
          A mix of the most positive, negative, and most-engaged posts from the last 7 days.
        </p>
      </div>

      <ul className="space-y-3">
        {posts.map(p => (
          <li key={p.id} className="rounded-md border border-gray-100 p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between gap-3 mb-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${SENTIMENT_BADGE[p.sentiment_label] ?? SENTIMENT_BADGE.neutral}`}>
                {p.sentiment_label}
              </span>
              <a
                href={p.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
              >
                view on X ↗
              </a>
            </div>

            <p className="text-sm text-gray-900 mb-2 leading-snug">{p.text}</p>

            <div className="flex items-center gap-4 text-xs text-gray-400">
              {p.author_username && (
                <span className="font-medium text-gray-500">@{p.author_username}</span>
              )}
              <span>♥ {p.like_count.toLocaleString()}</span>
              <span>↩ {p.reply_count.toLocaleString()}</span>
              <span>{relativeTime(p.posted_at)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
