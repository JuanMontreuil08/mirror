import { NextRequest } from 'next/server'
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages'
import { buildAgentGraph } from '@/lib/agent/graph'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { messages, portfolioContext } = await req.json()

  // Verify auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  // Convert messages to LangChain format
  const langchainMessages: BaseMessage[] = messages.map((m: { role: string; content: string }) =>
    m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
  )

  const graph = buildAgentGraph(portfolioContext ?? '')

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const eventStream = graph.streamEvents(
          { messages: langchainMessages },
          { version: 'v2' }
        )

        for await (const event of eventStream) {
          if (event.event === 'on_chat_model_stream') {
            const chunk = event.data?.chunk
            const text = chunk?.content
            if (typeof text === 'string' && text) {
              controller.enqueue(encoder.encode(text))
            }
          }
        }
      } catch (err) {
        console.error('Agent error:', err)
        controller.enqueue(encoder.encode('\n\nSomething went wrong. Please try again.'))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
