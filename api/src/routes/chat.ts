import { Hono } from 'hono'
import { getChatSystemPrompt } from '../subjects/chinese/prompts/chat-system'
import { chatStream, parseAzureStream, generateConversationTitle } from '../services/azure-openai'
import * as supabase from '../services/supabase'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env; Variables: { userId: string } }>()

app.post('/chat', async (c) => {
  const userId = c.get('userId')
  let body: { conversationId?: string; message?: string; subject?: string }
  try {
    body = (await c.req.json()) as typeof body
  } catch {
    return c.json({ message: 'Invalid JSON' }, 400)
  }
  const message = (body.message ?? '').trim()
  if (!message) return c.json({ message: 'message is required' }, 400)

  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY
  let conversationId = body.conversationId ?? ''
  const isNewConversation = !body.conversationId

  const history: Array<{ role: 'user' | 'assistant'; content: string }> = []

  if (conversationId) {
    try {
      const rows = await supabase.getConversationMessages(baseUrl, serviceKey, conversationId)
      for (const row of rows) {
        if (row.role === 'user' || row.role === 'assistant') {
          history.push({ role: row.role, content: row.content })
        }
      }
    } catch {
      conversationId = ''
    }
  }

  if (!conversationId) {
    try {
      conversationId = await supabase.createConversation(baseUrl, serviceKey, {
        subject: body.subject ?? 'chinese',
      })
    } catch (e) {
      return c.json({ message: 'Failed to create conversation' }, 500)
    }
  }

  await supabase.createMessage(baseUrl, serviceKey, {
    conversation_id: conversationId,
    role: 'user',
    content: message,
  })
  history.push({ role: 'user', content: message })

  const systemPrompt = getChatSystemPrompt({
    studentName: '同學',
    gradeLevel: 3,
  })

  const openAiMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ]

  const endpoint = (c.env.AZURE_OPENAI_ENDPOINT ?? '').trim()
  const apiKey = (c.env.AZURE_OPENAI_API_KEY ?? '').trim()
  if (!endpoint || !apiKey) {
    return c.json(
      { message: 'Azure OpenAI 未設定', detail: '請在 .dev.vars 設定 AZURE_OPENAI_ENDPOINT 與 AZURE_OPENAI_API_KEY' },
      503
    )
  }

  let fullContent = ''
  let stream: ReadableStream<Uint8Array>
  try {
    stream = await chatStream(endpoint, apiKey, openAiMessages)
  } catch (e) {
    const encoder = new TextEncoder()
    const errMsg = (e as Error).message
    const readable = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ content: `錯誤（未接上 AI）：${errMsg}` })}\n`)
        )
        controller.close()
      },
    })
    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        fullContent = await parseAzureStream(stream, (delta) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n`))
        })
        await supabase.createMessage(baseUrl, serviceKey, {
          conversation_id: conversationId,
          role: 'assistant',
          content: fullContent,
        })
        await supabase.updateConversationUpdatedAt(baseUrl, serviceKey, conversationId)
        if (isNewConversation && fullContent) {
          try {
            const title = await generateConversationTitle(endpoint, apiKey, message, fullContent)
            await supabase.updateConversationTitle(baseUrl, serviceKey, conversationId, title)
          } catch {
            // 標題生成失敗不影響對話，略過
          }
        }
        // 最後再送 conversationId，前端會 refetch 列表，此時標題已寫入
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ conversationId })}\n`))
      } catch (e) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ content: `錯誤：${(e as Error).message}` })}\n`)
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
})

export const chatRoutes = app
