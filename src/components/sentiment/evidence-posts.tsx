'use client'

import { useState } from 'react'

type NewsPost = {
  id: string
  text: string
  author_username: string | null
  permalink: string
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

export function EvidencePosts({ posts }: { posts: NewsPost[] }) {
  const [open, setOpen] = useState(false)

  if (posts.length === 0) return null

  return (
    <div className="rounded-lg border border-gray-100 bg-white">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors rounded-lg"
      >
        <div>
          <h3 className="text-lg font-semibold text-gray-900">News Articles</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {posts.length} articles analyzed from the last 7 days
          </p>
        </div>
        <span className="text-gray-400 text-lg ml-4">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <ul className="border-t border-gray-100 divide-y divide-gray-50">
          {posts.map(p => (
            <li key={p.id} className="p-4 hover:bg-gray-50 transition-colors">
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
                  read article ↗
                </a>
              </div>

              <p className="text-sm text-gray-900 mb-2 leading-snug">{p.text}</p>

              <div className="flex items-center gap-4 text-xs text-gray-400">
                {p.author_username && (
                  <span className="font-medium text-gray-500">{p.author_username}</span>
                )}
                <span>{relativeTime(p.posted_at)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
