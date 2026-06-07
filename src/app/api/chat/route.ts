import { NextRequest } from 'next/server'
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages'
import { buildAgentGraph } from '@/lib/agent/graph'
import { createClient } from '@/lib/supabase/server'
import { Position } from '@/types'

export async function POST(req: NextRequest) {
  const { messages, portfolioContext, positions, conversationId } = await req.json()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  // ── Resolve or create conversation ──────────────────────────────────────────
  let convId: string = conversationId ?? ''

  const userMessage: string = messages[messages.length - 1]?.content ?? ''

  if (!convId) {
    const title = userMessage.slice(0, 60) || 'New conversation'
    const { data: conv } = await supabase
      .from('conversations')
      .insert({ user_id: user.id, title })
      .select('id')
      .single()
    convId = conv?.id ?? ''
  }

  // ── Persist user message ─────────────────────────────────────────────────────
  if (convId && userMessage) {
    await supabase.from('messages').insert({
      conversation_id: convId,
      role: 'user',
      content: userMessage,
    })
  }

  // ── Run agent ────────────────────────────────────────────────────────────────
  const langchainMessages: BaseMessage[] = messages.map((m: { role: string; content: string }) =>
    m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
  )

  const graph = buildAgentGraph(portfolioContext ?? '', (positions ?? []) as Position[])

  const encoder = new TextEncoder()
  const headers: Record<string, string> = { 'Content-Type': 'text/plain; charset=utf-8' }
  if (convId) headers['X-Conversation-Id'] = convId

  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = ''
      try {
        const eventStream = graph.streamEvents(
          { messages: langchainMessages },
          { version: 'v2' }
        )

        for await (const event of eventStream) {
          if (event.event === 'on_chat_model_stream') {
            const chunk = event.data?.chunk
            const content = chunk?.content
            let text = ''
            if (typeof content === 'string') {
              text = content
            } else if (Array.isArray(content)) {
              text = content
                .filter((b: { type: string }) => b.type === 'text')
                .map((b: { text: string }) => b.text)
                .join('')
            }
            if (text) {
              fullResponse += text
              controller.enqueue(encoder.encode(text))
            }
          }
        }

        // Persist assistant response after stream completes
        if (convId && fullResponse) {
          await supabase.from('messages').insert({
            conversation_id: convId,
            role: 'assistant',
            content: fullResponse,
          })
        }
      } catch (err) {
        console.error('Agent error:', err)
        controller.enqueue(encoder.encode('\n\nSomething went wrong. Please try again.'))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, { headers })
}
