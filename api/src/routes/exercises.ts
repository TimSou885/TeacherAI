import { Hono } from 'hono'
import * as supabase from '../services/supabase'
import type { Env } from '../index'
import type { AuthVariables } from '../middleware/auth'

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>()

/** GET /api/exercises?class_id=xxx&category=dictation — 列出練習（學生用 JWT 的 classId，老師用 query class_id） */
app.get('/exercises', async (c) => {
  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY
  const studentId = c.get('studentId')
  const classId = studentId ? c.get('classId') : c.req.query('class_id')
  if (!classId) {
    return c.json({ message: 'class_id required (or login as student)' }, 400)
  }
  const category = c.req.query('category')
  try {
    const list = await supabase.listExercises(baseUrl, serviceKey, classId, category ? { category } : undefined)
    return c.json({ exercises: list })
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

/** GET /api/exercises/:id — 取得單一練習（含 questions） */
app.get('/exercises/:id', async (c) => {
  const id = c.req.param('id')
  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY
  try {
    const exercise = await supabase.getExerciseById(baseUrl, serviceKey, id)
    if (!exercise) return c.json({ message: 'Not found' }, 404)
    return c.json(exercise)
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

export const exerciseRoutes = app
