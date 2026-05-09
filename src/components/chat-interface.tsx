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

// ─── Markdown renderer (Instrument Serif prose + DM Mono for data) ────────────

function AssistantMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="font-ui text-[17px] leading-relaxed mb-3 last:mb-0" style={{ color: 'var(--color-text)' }}>{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold" style={{ color: 'var(--color-text)' }}>{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic font-ui" style={{ color: 'var(--color-text-muted)' }}>{children}</em>
        ),
        ul: ({ children }) => (
          <ul className="font-ui text-[17px] space-y-1 mb-3 pl-4" style={{ color: 'var(--color-text)' }}>{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="font-ui text-[17px] space-y-1 mb-3 pl-4 list-decimal" style={{ color: 'var(--color-text)' }}>{children}</ol>
        ),
        li: ({ children }) => (
          <li className="leading-relaxed before:content-['–'] before:mr-2" style={{ listStyle: 'none', ['--tw-prose-bullets' as string]: 'none' }}>{children}</li>
        ),
        code: ({ children }) => (
          <code className="font-data text-xs rounded px-1.5 py-0.5" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border-sub)', color: 'var(--color-text-muted)' }}>{children}</code>
        ),
        pre: ({ children }) => (
          <pre className="font-data text-xs rounded-[12px] p-4 overflow-x-auto mb-3 leading-relaxed" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border-sub)', color: 'var(--color-text-muted)' }}>{children}</pre>
        ),
        h1: ({ children }) => (
          <h1 className="font-ui text-base font-semibold mb-2 mt-4 first:mt-0" style={{ color: 'var(--color-text)' }}>{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="font-ui text-sm font-semibold mb-2 mt-4 first:mt-0" style={{ color: 'var(--color-text)' }}>{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="font-ui text-sm font-medium mb-1 mt-3 first:mt-0" style={{ color: 'var(--color-text)' }}>{children}</h3>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-xs border-collapse">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead style={{ borderBottom: '1px solid var(--color-border-sub)' }}>{children}</thead>
        ),
        th: ({ children }) => (
          <th className="text-left font-data uppercase tracking-wider text-[10px] pb-2 pr-6 first:pl-0" style={{ color: 'var(--color-text-faint)' }}>{children}</th>
        ),
        tbody: ({ children }) => <tbody>{children}</tbody>,
        tr: ({ children }) => (
          <tr style={{ borderBottom: '1px solid var(--color-border-sub)' }}>{children}</tr>
        ),
        td: ({ children }) => (
          <td className="font-data py-1.5 pr-6 first:pl-0 tabular-nums" style={{ color: 'var(--color-text-muted)' }}>{children}</td>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-text)', textDecorationColor: 'var(--color-border-sub)' }}
          >
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="pl-3 mb-3 font-ui italic" style={{ borderLeft: '2px solid var(--color-border-sub)', color: 'var(--color-text-muted)' }}>{children}</blockquote>
        ),
        hr: () => <hr className="my-4" style={{ borderColor: 'var(--color-border-sub)' }} />,
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
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--color-border-sub)' }}>
        <div className="flex items-center justify-between mb-3">
          <p
            className="font-data text-[9px] uppercase tracking-[0.15em]"
            style={{ color: 'var(--color-text-faint)' }}
          >
            Portfolio
          </p>
          <div className="flex items-center gap-3">
            {hasFees && (
              <button
                onClick={() => setShowFees(v => !v)}
                className="font-data text-[9px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-[6px] transition-all"
                style={{
                  backgroundColor: showFees ? 'rgba(255,255,255,0.15)' : 'transparent',
                  color: showFees ? 'var(--color-text)' : 'var(--color-text-faint)',
                }}
              >
                incl. fees
              </button>
            )}
            <Link
              href="/dashboard/upload"
              className="font-data text-[10px] transition-colors"
              style={{ color: 'var(--color-text-faint)' }}
            >
              + Add
            </Link>
          </div>
        </div>

        {/* Portfolio total — always colored (per DESIGN.md exception) */}
        <div
          className="font-ui font-light text-[28px] leading-none tabular-nums"
          style={{ color: 'var(--color-text)' }}
        >
          ${currentTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div
          className="flex items-center gap-1.5 mt-1.5 font-data text-[11px] tabular-nums"
          style={{ color: isUp ? 'var(--color-gain)' : 'var(--color-loss)' }}
        >
          <span>{isUp ? '↑' : '↓'}</span>
          <span>{isUp ? '+' : '-'}${Math.abs(totalPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span style={{ color: 'var(--color-text-faint)' }}>/</span>
          <span>{isUp ? '+' : ''}{totalPnlPct.toFixed(2)}%</span>
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
          const isHighConcentration = weight >= 35

          return (
            <div
              key={p.ticker}
              className="position-card px-5 py-3.5 transition-colors animate-fade-in"
              style={{
                borderBottom: '1px solid var(--color-border-sub)',
                animationDelay: `${idx * 40}ms`,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div className="flex items-start justify-between mb-1.5">
                <div>
                  <span
                    className="font-ui text-[13px] font-medium tracking-tight"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {p.ticker}
                  </span>
                  <span
                    className="font-data text-[10px] ml-1.5"
                    style={{ color: 'var(--color-text-faint)' }}
                  >
                    {Number(p.quantity).toFixed(4)} sh
                  </span>
                </div>
                <div className="text-right">
                  {price ? (
                    <>
                      <div
                        className="font-data text-[13px] tabular-nums leading-none"
                        style={{ color: 'var(--color-text)' }}
                      >
                        ${price.price.toFixed(2)}
                      </div>
                      <div
                        className="font-data text-[10px] tabular-nums mt-0.5"
                        style={{ color: price.changePct >= 0 ? 'var(--color-gain)' : 'var(--color-loss)' }}
                      >
                        {price.changePct >= 0 ? '+' : ''}{price.changePct.toFixed(2)}%
                      </div>
                    </>
                  ) : (
                    <span className="font-data text-[10px]" style={{ color: 'var(--color-text-faint)' }}>—</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                {/* P&L: neutral by default, reveals on hover via CSS classes */}
                {pnl !== null && pnlPct !== null ? (
                  <span className={`font-data text-[10px] tabular-nums pos-pnl ${posUp ? 'pos-pnl-gain' : 'pos-pnl-loss'}`}>
                    {posUp ? '+' : ''}${Math.abs(pnl).toFixed(2)} ({posUp ? '+' : ''}{pnlPct.toFixed(1)}%)
                  </span>
                ) : <span />}
                <div className="flex items-center gap-1">
                  {isHighConcentration && (
                    <span
                      className="font-data text-[9px] px-1 py-0.5 rounded-[4px]"
                      style={{ color: 'var(--color-warn)', backgroundColor: 'var(--color-warn-bg)' }}
                    >
                      ⚠
                    </span>
                  )}
                  <span
                    className="font-data text-[10px] tabular-nums"
                    style={{ color: 'var(--color-text-faint)' }}
                  >
                    {weight.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Weight bar */}
              <div className="h-[2px] overflow-hidden rounded-full" style={{ backgroundColor: 'var(--color-border-sub)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(weight, 100)}%`,
                    backgroundColor: isHighConcentration ? 'var(--color-warn)' : 'var(--color-cta)',
                  }}
                />
              </div>
            </div>
          )
        })}

        {positions.length === 0 && (
          <div className="text-center py-12 px-5">
            <p className="font-data text-[11px] mb-3" style={{ color: 'var(--color-text-faint)' }}>
              No positions yet.
            </p>
            <Link
              href="/dashboard/upload"
              className="font-ui text-xs font-medium transition-colors px-3 py-1.5 rounded-[12px]"
              style={{
                color: 'var(--color-text-muted)',
                border: '1px solid var(--color-border-sub)',
              }}
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
          className="w-1.5 h-1.5 rounded-full animate-bounce"
          style={{ backgroundColor: 'var(--color-text-faint)', animationDelay: `${delay}ms` }}
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
          positions,
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
    <div className="flex" style={{ height: 'calc(100vh - 48px)', overflow: 'hidden' }}>

      {/* ── Chat area ── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* ── Input at TOP (Mirror design principle) ── */}
        <div className="px-6 pt-5 pb-3">
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSubmit}>
              <div
                className="glass flex items-end gap-3 px-5 py-3 rounded-[28px] transition-all duration-200"
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your portfolio…"
                  rows={1}
                  className="flex-1 bg-transparent text-sm resize-none outline-none max-h-32 font-ui"
                  style={{
                    lineHeight: '1.6',
                    color: 'var(--color-text)',
                    fontFamily: 'var(--font-ui)',
                  }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0 transition-all duration-150 disabled:opacity-20"
                  style={{ backgroundColor: 'var(--color-cta)' }}
                >
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto px-6 pb-5">
          <div className="max-w-2xl mx-auto">

            {/* Empty state — hero + suggestions */}
            {isEmpty && (
              <div className="pt-8 pb-10">
                <div className="animate-fade-up delay-0 mb-8">
                  <p
                    className="font-data text-[10px] uppercase tracking-[0.18em] mb-4"
                    style={{ color: 'var(--color-text-faint)' }}
                  >
                    Portfolio Assistant
                  </p>
                  <h1
                    className="font-ui font-light text-[36px] leading-tight mb-2"
                    style={{ color: 'var(--color-text)' }}
                  >
                    What do you want<br />to know?
                  </h1>
                  <p
                    className="font-ui italic text-[15px]"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Ask about your portfolio, prices, or recent news.
                  </p>
                </div>

                {/* Suggestion pills — ghost style */}
                <div className="grid grid-cols-2 gap-2">
                  {(suggestedQuestions ?? SUGGESTIONS).map((s, i) => (
                    <button
                      key={s.text}
                      onClick={() => sendMessage(s.text)}
                      className="group text-left px-4 py-3 rounded-[20px] transition-all duration-200 animate-fade-up"
                      style={{
                        border: '1px solid var(--color-border-sub)',
                        backgroundColor: 'transparent',
                        animationDelay: `${80 + i * 60}ms`,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.07)';
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.20)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                      }}
                    >
                      <span className="block mb-1.5 text-base">{s.icon}</span>
                      <span
                        className="font-ui text-xs leading-relaxed transition-colors"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        {s.text}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Portfolio toggle — below suggestions */}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setPanelOpen((o) => !o)}
                    className="font-ui text-[11px] font-medium px-3 py-1.5 rounded-[6px] transition-all duration-200"
                    style={{
                      color: panelOpen ? '#FFFFFF' : 'var(--color-text-muted)',
                      backgroundColor: panelOpen ? 'var(--color-cta)' : 'transparent',
                      border: panelOpen ? 'none' : '1px solid var(--color-border-sub)',
                    }}
                  >
                    {panelOpen ? '✕ Close' : 'My portfolio →'}
                  </button>
                </div>
              </div>
            )}

            {/* Portfolio toggle when conversation is active */}
            {!isEmpty && (
              <div className="flex justify-end pt-2 pb-4">
                <button
                  onClick={() => setPanelOpen((o) => !o)}
                  className="font-ui text-[11px] font-medium px-3 py-1.5 rounded-[6px] transition-all duration-200"
                  style={{
                    color: panelOpen ? '#FFFFFF' : 'var(--color-text-muted)',
                    backgroundColor: panelOpen ? 'var(--color-cta)' : 'transparent',
                    border: panelOpen ? 'none' : '1px solid var(--color-border-sub)',
                  }}
                >
                  {panelOpen ? '✕ Close' : 'My portfolio →'}
                </button>
              </div>
            )}

            {/* Messages */}
            <div className="space-y-8">
              {messages.map((m) => (
                <div key={m.id} className={`flex animate-fade-up ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'user' ? (
                    <div
                      className="font-ui text-sm leading-relaxed px-4 py-2.5 rounded-[20px] rounded-br-[6px] max-w-[75%]"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.12)',
                        border: '1px solid rgba(255,255,255,0.10)',
                        color: 'var(--color-text)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                      }}
                    >
                      {m.content}
                    </div>
                  ) : (
                    <div
                      className="glass max-w-[90%] min-w-0 px-5 py-4 rounded-[20px] rounded-bl-[6px]"
                    >
                      {m.content ? (
                        <AssistantMessage content={m.content} />
                      ) : (
                        <TypingDots />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Hint */}
        {!isEmpty && (
          <div className="px-6 pb-3 text-center">
            <p
              className="font-data text-[10px] tracking-wide"
              style={{ color: 'var(--color-text-faint)' }}
            >
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        )}
      </div>

      {/* ── Portfolio panel ── */}
      <div
        className="flex-shrink-0 overflow-hidden transition-all duration-300"
        style={{
          width: panelOpen ? '272px' : '0px',
          borderLeft: panelOpen ? '1px solid rgba(255,255,255,0.08)' : 'none',
          backgroundColor: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: panelOpen ? '-4px 0 24px rgba(0,0,0,0.30)' : 'none',
        }}
      >
        {panelOpen && (
          <PortfolioPanel positions={positions} prices={prices} totalInvested={totalInvested} />
        )}
      </div>
    </div>
  )
}
