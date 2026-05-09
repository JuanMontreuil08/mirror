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

function getSentimentBadgeStyle(label: string): { color: string; backgroundColor: string } {
  switch (label) {
    case 'positive': return { color: 'var(--color-gain)', backgroundColor: 'var(--color-gain-bg)' }
    case 'negative': return { color: 'var(--color-loss)', backgroundColor: 'var(--color-loss-bg)' }
    default:         return { color: 'var(--color-text-faint)', backgroundColor: 'rgba(0,0,0,0.04)' }
  }
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
    <div className="glass-card rounded-[20px]">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-6 text-left rounded-[20px] transition-colors"
        style={{ color: 'var(--color-text)' }}
      >
        <div>
          <h3
            className="font-ui text-base font-medium"
            style={{ color: 'var(--color-text)' }}
          >
            News Articles
          </h3>
          <p
            className="font-ui italic text-sm mt-0.5"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {posts.length} articles analyzed from the last 7 days
          </p>
        </div>
        <span className="font-data text-sm ml-4" style={{ color: 'var(--color-text-faint)' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <ul style={{ borderTop: '1px solid var(--color-border-sub)' }}>
          {posts.map(p => (
            <li
              key={p.id}
              className="p-4 transition-colors"
              style={{ borderBottom: '1px solid var(--color-border-sub)' }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <span
                  className="font-data text-[10px] uppercase tracking-[0.08em] px-2 py-0.5 rounded-[6px] flex-shrink-0"
                  style={getSentimentBadgeStyle(p.sentiment_label)}
                >
                  {p.sentiment_label}
                </span>
                <a
                  href={p.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-ui text-xs flex-shrink-0 transition-opacity hover:opacity-70"
                  style={{ color: 'var(--color-text-faint)' }}
                >
                  read article ↗
                </a>
              </div>

              <p
                className="font-ui text-sm mb-2 leading-snug"
                style={{ color: 'var(--color-text)' }}
              >
                {p.text}
              </p>

              <div className="flex items-center gap-4 font-data text-[10px]" style={{ color: 'var(--color-text-faint)' }}>
                {p.author_username && (
                  <span style={{ color: 'var(--color-text-muted)' }}>{p.author_username}</span>
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
