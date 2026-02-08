import { Hono } from 'hono'
import * as supabase from '../services/supabase'
import type { Env } from '../index'
import type { AuthVariables } from '../middleware/auth'

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>()

app.get('/conversations', async (c) => {
  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY
  const studentId = c.get('studentId')
  try {
    const list = await supabase.listConversations(
      baseUrl,
      serviceKey,
      studentId ? { student_id: studentId } : { teacher_only: true }
    )
    return c.json({ conversations: list })
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

app.get('/conversations/:id', async (c) => {
  const id = c.req.param('id')
  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY
  const studentId = c.get('studentId')
  try {
    const convStudentId = await supabase.getConversationStudentId(baseUrl, serviceKey, id)
    if (studentId) {
      if (convStudentId !== studentId) return c.json({ message: 'Not found' }, 404)
    } else {
      if (convStudentId !== null) return c.json({ message: 'Not found' }, 404)
    }
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
  const studentId = c.get('studentId')
  try {
    const convStudentId = await supabase.getConversationStudentId(baseUrl, serviceKey, id)
    if (studentId) {
      if (convStudentId !== studentId) return c.json({ message: 'Not found' }, 404)
    } else {
      if (convStudentId !== null) return c.json({ message: 'Not found' }, 404)
    }
    await supabase.deleteConversation(baseUrl, serviceKey, id)
    return c.json({ ok: true })
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

export const conversationRoutes = app
