import { Hono } from 'hono'
import * as supabase from '../services/supabase'
import { verifyStudentJwt } from '../services/student-jwt'
import type { Env } from '../index'
import type { AuthVariables } from '../middleware/auth'

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>()

async function getStudentId(c: { get: (k: string) => string | undefined; env: Env; req: { header: (k: string) => string | undefined } }) {
  let studentId = c.get('studentId')
  if (!studentId) {
    const secret = c.env.STUDENT_JWT_SECRET
    const auth = c.req.header('Authorization')
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
    if (secret && token) {
      const payload = await verifyStudentJwt(secret, token)
      if (payload) return payload.sub
    }
  }
  return studentId ?? null
}

/** GET /api/error-book — 取得學生待複習錯題（is_resolved = false） */
app.get('/error-book', async (c) => {
  const studentId = await getStudentId(c)
  if (!studentId) return c.json({ message: 'Student login required', code: 'student_required' }, 401)

  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit')) || 10))
  try {
    const items = await supabase.listErrorBookItems(baseUrl, serviceKey, studentId, { limit })
    return c.json({ items })
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

/** POST /api/error-book/:id/practice — 記錄錯題複習結果（答對 / 答錯） */
app.post('/error-book/:id/practice', async (c) => {
  const studentId = await getStudentId(c)
  if (!studentId) return c.json({ message: 'Student login required', code: 'student_required' }, 401)

  const id = c.req.param('id')
  let body: { isCorrect?: boolean }
  try {
    body = (await c.req.json()) as typeof body
  } catch {
    return c.json({ message: 'Invalid JSON' }, 400)
  }
  const isCorrect = body.isCorrect === true

  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY
  try {
    await supabase.updateErrorBookPractice(baseUrl, serviceKey, id, isCorrect, studentId ?? undefined)
    return c.json({ success: true })
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

export const errorBookRoutes = app
