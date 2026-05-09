# TODOS

## Agent (Phase C / B)

**TODO-1: Tool chaining acceptance test**
**Priority:** P1
Manually run 5 "how's [ticker] doing?" queries, verify 4/5 chain both `get_prices` AND `get_news`.
Already confirmed 4/4 in QA — this validates the design doc criterion formally.
If <4 pass: add a pre-agent forced tool-call node in `graph.ts` before the agent node.
Files: `src/lib/agent/graph.ts`

**TODO-2: Broker-agnostic voucher extractor**
**Priority:** P1
Refactor `src/lib/claude/voucher-extractor.ts` to accept a `broker: string` parameter
and use broker-specific prompt templates. Currently hardcoded for Hapi.
Do this BEFORE Phase B to avoid re-architecting mid-development.
Files: `src/lib/claude/voucher-extractor.ts`

**TODO-3: Test infrastructure**
**Priority:** P2
Set up vitest + unit tests for `getSuggestedQuestions()` in dashboard/page.tsx.
Defer to post-demo.
Files: `src/app/(dashboard)/dashboard/page.tsx`

## Phase B (post-demo)

**TODO-4: portfolio_analysis tool**
**Priority:** P2
Add `portfolio_analysis` LangGraph tool to `graph.ts`: pulls positions from Supabase,
computes P&L per position, total portfolio P&L, concentration risk, biggest mover since purchase.
Files: `src/lib/agent/graph.ts`

**TODO-5: explain_concept tool**
**Priority:** P2
Add `explain_concept` LangGraph tool: when agent mentions a financial term, call this to get
a plain-language explanation. Static dictionary for top 20 terms + Gemini fallback.
Files: `src/lib/agent/graph.ts`

## Phase D (post-Phase B validation)

**TODO-6: Proactive alerting**
**Priority:** P3
Daily summaries push by email using Resend + Claude API (claude-sonnet-4-6).
Resend API key already present. SDK installed. Alert thresholds should come from
observed user behavior, not assumptions.
Files: new — `src/app/api/alerts/`, email templates

## Completed

