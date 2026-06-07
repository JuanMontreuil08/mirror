'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
}

interface Group {
  label: string
  items: Conversation[]
}

function groupByDate(convs: Conversation[]): Group[] {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday.getTime() - 86400_000)
  const startOf7DaysAgo = new Date(startOfToday.getTime() - 6 * 86400_000)

  const groups: Group[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Last 7 days', items: [] },
    { label: 'Older', items: [] },
  ]

  for (const c of convs) {
    const d = new Date(c.updated_at)
    if (d >= startOfToday) groups[0].items.push(c)
    else if (d >= startOfYesterday) groups[1].items.push(c)
    else if (d >= startOf7DaysAgo) groups[2].items.push(c)
    else groups[3].items.push(c)
  }

  return groups.filter(g => g.items.length > 0)
}

interface Props {
  activeConversationId: string | null
  onNewChat: () => void
  refreshSignal: number
}

export default function ConversationSidebar({ activeConversationId, onNewChat, refreshSignal }: Props) {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])

  const load = useCallback(async () => {
    const res = await fetch('/api/conversations')
    if (res.ok) setConversations(await res.json())
  }, [])

  useEffect(() => { load() }, [load, refreshSignal])

  const groups = groupByDate(conversations)

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        width: '240px',
        borderRight: '1px solid rgba(0,0,0,0.07)',
        backgroundColor: 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-4"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
      >
        <span
          className="font-data text-[9px] uppercase tracking-[0.16em]"
          style={{ color: 'var(--color-text-faint)' }}
        >
          Conversations
        </span>
        <button
          onClick={onNewChat}
          className="flex items-center justify-center w-6 h-6 rounded-[6px] transition-all duration-150"
          style={{ color: 'var(--color-text-faint)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.06)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          title="New chat"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-2">
        {conversations.length === 0 && (
          <p
            className="font-ui text-xs px-4 py-6 text-center"
            style={{ color: 'var(--color-text-faint)' }}
          >
            No conversations yet.
          </p>
        )}

        {groups.map(group => (
          <div key={group.label} className="mb-3">
            <p
              className="font-data text-[9px] uppercase tracking-[0.14em] px-4 py-1.5"
              style={{ color: 'var(--color-text-faint)' }}
            >
              {group.label}
            </p>

            {group.items.map(conv => {
              const isActive = conv.id === activeConversationId
              return (
                <button
                  key={conv.id}
                  onClick={() => router.push(`/dashboard?c=${conv.id}`)}
                  className="w-full text-left px-4 py-2.5 transition-all duration-100"
                  style={{
                    backgroundColor: isActive ? 'rgba(0,0,0,0.07)' : 'transparent',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.04)'
                  }}
                  onMouseLeave={e => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                  }}
                >
                  <p
                    className="font-ui text-[13px] leading-snug truncate"
                    style={{ color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)' }}
                  >
                    {conv.title}
                  </p>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
