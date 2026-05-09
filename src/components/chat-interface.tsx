'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Position } from '@/types'
import { TickerPrice } from '@/lib/finnhub/client'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  portfolioContext: string
  userEmail?: string
  positions: Position[]
  prices: Record<string, TickerPrice>
  totalInvested: number
  suggestedQuestions?: { text: string; icon: string }[]
}

const SUGGESTIONS = [
  { text: 'How is my portfolio doing today?', icon: '📊' },
  { text: "What's the latest news on NVDA?", icon: '📰' },
  { text: 'Which stock has the highest weight?', icon: '⚖️' },
  { text: 'Show me NFLX price history for the last 2 weeks', icon: '📈' },
]

// ─── Markdown renderer ────────────────────────────────────────────────────────

function AssistantMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="text-sm text-gray-700 leading-relaxed mb-3 last:mb-0">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-gray-900">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-gray-600">{children}</em>
        ),
        ul: ({ children }) => (
          <ul className="text-sm text-gray-700 space-y-1 mb-3 pl-4">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="text-sm text-gray-700 space-y-1 mb-3 pl-4 list-decimal">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="leading-relaxed before:content-['–'] before:mr-2 before:text-gray-300">{children}</li>
        ),
        code: ({ children }) => (
          <code className="font-mono text-xs bg-stone-100 border border-stone-200 rounded px-1.5 py-0.5 text-gray-700">{children}</code>
        ),
        pre: ({ children }) => (
          <pre className="font-mono text-xs bg-stone-100 border border-stone-200 rounded-xl p-4 overflow-x-auto mb-3 text-gray-700 leading-relaxed">{children}</pre>
        ),
        h1: ({ children }) => (
          <h1 className="text-base font-semibold text-gray-900 mb-2 mt-4 first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-sm font-semibold text-gray-900 mb-2 mt-4 first:mt-0">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-medium text-gray-900 mb-1 mt-3 first:mt-0">{children}</h3>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-xs border-collapse">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="border-b border-stone-200">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="text-left font-medium text-gray-400 uppercase tracking-wider text-[10px] pb-2 pr-6 first:pl-0">{children}</th>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y divide-stone-100">{children}</tbody>
        ),
        tr: ({ children }) => (
          <tr className="hover:bg-stone-50/60 transition-colors">{children}</tr>
        ),
        td: ({ children }) => (
          <td className="font-mono text-gray-700 py-1.5 pr-6 first:pl-0 tabular-nums">{children}</td>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-900 underline underline-offset-2 decoration-stone-300 hover:decoration-gray-900 transition-colors"
          >
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-stone-200 pl-3 text-gray-500 mb-3">{children}</blockquote>
        ),
        hr: () => <hr className="border-stone-100 my-4" />,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

// ─── Portfolio Panel ──────────────────────────────────────────────────────────

function PortfolioPanel({
  positions,
  prices,
  totalInvested,
}: {
  positions: Position[]
  prices: Record<string, TickerPrice>
  totalInvested: number
}) {
  const [showFees, setShowFees] = useState(false)

  const totalFees = positions.reduce((sum, p) => sum + Number(p.total_fees ?? 0), 0)
  const hasFees = totalFees > 0

  const currentTotal = positions.reduce((sum, p) => {
    const price = prices[p.ticker]
    return sum + (price ? price.price * Number(p.quantity) : Number(p.total_invested))
  }, 0)

  const effectiveCost = showFees ? totalInvested + totalFees : totalInvested
  const totalPnl = currentTotal - effectiveCost
  const totalPnlPct = effectiveCost > 0 ? (totalPnl / effectiveCost) * 100 : 0
  const isUp = totalPnl >= 0

  return (
    <div className="flex flex-col h-full overflow-hidden animate-slide-in-right">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-stone-100">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest">Portfolio</p>
          <div className="flex items-center gap-3">
            {hasFees && (
              <button
                onClick={() => setShowFees(v => !v)}
                className={`text-[9px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-md transition-all ${
                  showFees
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-300 hover:text-gray-500'
                }`}
              >
                incl. fees
              </button>
            )}
            <Link
              href="/dashboard/upload"
              className="text-[10px] text-gray-400 hover:text-gray-900 transition-colors font-medium"
            >
              + Add
            </Link>
          </div>
        </div>
        <div className="text-[22px] font-semibold tracking-tight text-gray-900 tabular-nums leading-none">
          ${currentTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className={`flex items-center gap-1.5 mt-1.5 text-[11px] tabular-nums font-medium ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
          <span className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[8px] font-bold ${isUp ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
            {isUp ? '↑' : '↓'}
          </span>
          <span>{isUp ? '+' : '-'}${Math.abs(totalPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className="text-gray-300">/</span>
          <span>{isUp ? '+' : ''}{totalPnlPct.toFixed(2)}%</span>
          <span className="text-gray-300 font-normal">vs cost</span>
        </div>
      </div>

      {/* Positions */}
      <div className="flex-1 overflow-y-auto">
        {positions.map((p, idx) => {
          const price = prices[p.ticker]
          const currentValue = price ? price.price * Number(p.quantity) : null
          const posFees = Number(p.total_fees ?? 0)
          const costBasis = showFees ? Number(p.total_invested) + posFees : Number(p.total_invested)
          const pnl = currentValue !== null ? currentValue - costBasis : null
          const pnlPct = pnl !== null && costBasis > 0 ? (pnl / costBasis) * 100 : null
          const weight = currentTotal > 0 && currentValue !== null ? (currentValue / currentTotal) * 100 : 0
          const posUp = pnl === null ? null : pnl >= 0

          return (
            <div
              key={p.ticker}
              className="px-5 py-3.5 border-b border-stone-50 hover:bg-stone-50/60 transition-colors animate-fade-in"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div className="flex items-start justify-between mb-1.5">
                <div>
                  <span className="text-[13px] font-semibold text-gray-900 tracking-tight">{p.ticker}</span>
                  <span className="text-[10px] text-gray-300 ml-1.5 font-mono">{Number(p.quantity).toFixed(4)} sh</span>
                </div>
                <div className="text-right">
                  {price ? (
                    <>
                      <div className="text-[13px] font-semibold text-gray-900 tabular-nums leading-none">${price.price.toFixed(2)}</div>
                      <div className={`text-[10px] tabular-nums font-medium mt-0.5 ${price.changePct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {price.changePct >= 0 ? '+' : ''}{price.changePct.toFixed(2)}%
                      </div>
                    </>
                  ) : (
                    <span className="text-[10px] text-gray-200">—</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                {pnl !== null && pnlPct !== null ? (
                  <span className={`text-[10px] tabular-nums font-medium ${posUp ? 'text-emerald-600' : 'text-red-500'}`}>
                    {posUp ? '+' : ''}${Math.abs(pnl).toFixed(2)} ({posUp ? '+' : ''}{pnlPct.toFixed(1)}%)
                  </span>
                ) : <span />}
                <span className="text-[10px] text-gray-300 tabular-nums font-mono">{weight.toFixed(0)}%</span>
              </div>

              {/* Weight bar */}
              <div className="h-[2px] bg-stone-100 overflow-hidden rounded-full">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${weight >= 35 ? 'bg-amber-400' : 'bg-gray-800'}`}
                  style={{ width: `${Math.min(weight, 100)}%` }}
                />
              </div>
            </div>
          )
        })}

        {positions.length === 0 && (
          <div className="text-center py-12 px-5">
            <p className="text-[11px] text-gray-300 mb-3">No positions yet.</p>
            <Link
              href="/dashboard/upload"
              className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors border border-stone-200 rounded-lg px-3 py-1.5 hover:border-gray-300"
            >
              Add your first position
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <span className="flex gap-1 items-center h-5 px-1">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  )
}

// ─── Chat Interface ───────────────────────────────────────────────────────────

export default function ChatInterface({ portfolioContext, positions, prices, totalInvested, suggestedQuestions }: Omit<Props, 'userEmail'> & { userEmail?: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(content: string) {
    if (!content.trim() || loading) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: content.trim() }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    const assistantId = (Date.now() + 1).toString()
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          portfolioContext,
        }),
      })

      if (!res.ok || !res.body) throw new Error('Request failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m))
        )
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: 'Something went wrong. Please try again.' } : m
        )
      )
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex h-[calc(100vh-48px)] overflow-hidden bg-canvas">

      {/* ── Chat area ── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Portfolio toggle */}
        <div className="flex justify-end px-6 pt-3">
          <button
            onClick={() => setPanelOpen((o) => !o)}
            className={`text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all duration-200 ${
              panelOpen
                ? 'bg-gray-900 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-900 hover:bg-white hover:shadow-sm border border-transparent hover:border-stone-200'
            }`}
          >
            {panelOpen ? '✕ Close' : 'My portfolio →'}
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="max-w-2xl mx-auto space-y-8">

            {/* Empty state */}
            {isEmpty && (
              <div className="pt-14 pb-10">
                <div className="animate-fade-up delay-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-300 mb-3">
                    Portfolio Assistant
                  </p>
                  <h1 className="text-2xl font-semibold text-gray-900 mb-2 tracking-tight leading-snug">
                    What do you want<br />to know?
                  </h1>
                  <p className="text-sm text-gray-400 mb-8">
                    Ask about your portfolio, prices, or recent news.
                  </p>
                </div>

                {/* Suggestion cards — 2-column grid */}
                <div className="grid grid-cols-2 gap-2">
                  {(suggestedQuestions ?? SUGGESTIONS).map((s, i) => (
                    <button
                      key={s.text}
                      onClick={() => sendMessage(s.text)}
                      className="group text-left p-3.5 rounded-xl bg-white border border-stone-200 hover:border-stone-300 hover:shadow-card-hover transition-all duration-200 animate-fade-up"
                      style={{ animationDelay: `${80 + i * 60}ms` }}
                    >
                      <span className="text-base mb-2 block">{s.icon}</span>
                      <span className="text-xs text-gray-500 group-hover:text-gray-800 transition-colors leading-relaxed">
                        {s.text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((m) => (
              <div key={m.id} className={`flex animate-fade-up ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'user' ? (
                  <div className="bg-gray-900 text-white text-sm leading-relaxed px-4 py-2.5 rounded-2xl rounded-br-sm max-w-[75%] shadow-sm">
                    {m.content}
                  </div>
                ) : (
                  <div className="max-w-[90%] min-w-0">
                    {m.content ? (
                      <AssistantMessage content={m.content} />
                    ) : (
                      <TypingDots />
                    )}
                  </div>
                )}
              </div>
            ))}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input bar */}
        <div className="px-6 pb-5 pt-3">
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
            <div className="flex items-end gap-3 bg-white border border-stone-200 rounded-2xl px-4 py-3 shadow-input focus-within:shadow-input-focus focus-within:border-stone-300 transition-all duration-200">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your portfolio…"
                rows={1}
                className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-300 resize-none outline-none max-h-32"
                style={{ lineHeight: '1.6' }}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0 disabled:opacity-20 hover:bg-black transition-all duration-150 shadow-sm"
              >
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <p className="text-[10px] text-gray-300 text-center mt-2 tracking-wide">
              Enter to send · Shift+Enter for new line
            </p>
          </form>
        </div>
      </div>

      {/* ── Portfolio panel ── */}
      <div
        className={`flex-shrink-0 border-l border-stone-200/80 bg-white overflow-hidden transition-all duration-300 ease-spring ${
          panelOpen ? 'w-64 shadow-panel' : 'w-0'
        }`}
      >
        {panelOpen && (
          <PortfolioPanel positions={positions} prices={prices} totalInvested={totalInvested} />
        )}
      </div>
    </div>
  )
}
