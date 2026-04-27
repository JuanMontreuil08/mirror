import { HumanMessage } from '@langchain/core/messages'
import { buildAgentGraph } from './graph'

const question = 'Give me the historical prices for netflix in last week'

async function main() {
  console.log(`\nQuestion: "${question}"\n`)
  const graph = buildAgentGraph('')

  const eventStream = graph.streamEvents(
    { messages: [new HumanMessage(question)] },
    { version: 'v2' }
  )

  process.stdout.write('Answer: ')
  for await (const event of eventStream) {
    if (event.event === 'on_tool_start') {
      console.log(`\n[tool called] ${event.name} →`, JSON.stringify(event.data?.input))
      process.stdout.write('Answer: ')
    }
    if (event.event === 'on_chat_model_stream') {
      const text = event.data?.chunk?.content
      if (typeof text === 'string' && text) process.stdout.write(text)
    }
  }
  console.log('\n')
}

main().catch(console.error)
