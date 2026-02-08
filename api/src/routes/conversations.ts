import { Hono } from 'hono'
import * as supabase from '../services/supabase'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env; Variables: { userId: string } }>()

app.get('/conversations', async (c) => {
  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY
  try {
    const list = await supabase.listConversations(baseUrl, serviceKey)
    return c.json({ conversations: list })
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

app.get('/conversations/:id', async (c) => {
  const id = c.req.param('id')
  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY
  try {
    const rows = await supabase.getConversationMessages(baseUrl, serviceKey, id)
    const messages = rows.map((r) => ({
      id: r.id,
      role: r.role as 'user' | 'assistant',
      content: r.content,
    }))
    return c.json({ messages })
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

app.delete('/conversations/:id', async (c) => {
  const id = c.req.param('id')
  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY
  try {
    await supabase.deleteConversation(baseUrl, serviceKey, id)
    return c.json({ ok: true })
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

export const conversationRoutes = app
