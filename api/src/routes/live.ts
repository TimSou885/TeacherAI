import { Hono } from 'hono'
import * as supabase from '../services/supabase'
import { authMiddleware } from '../middleware/auth'
import type { Env } from '../index'
import type { AuthVariables } from '../middleware/auth'

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>()

app.use('*', authMiddleware)

/** POST /api/live/create — 教師建立即時測驗場次 */
app.post('/create', async (c) => {
  if (c.get('studentId')) return c.json({ message: 'Teachers only' }, 403)
  const userId = c.get('userId') ?? null
  if (!userId) return c.json({ message: 'Unauthorized' }, 401)

  let body: { class_id?: string; exercise_id?: string }
  try {
    body = (await c.req.json()) as typeof body
  } catch {
    return c.json({ message: 'Invalid JSON' }, 400)
  }
  const classId = body.class_id
  const exerciseId = body.exercise_id
  if (!classId || !exerciseId) return c.json({ message: 'class_id and exercise_id required' }, 400)

  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY
  const owns = await supabase.verifyTeacherOwnsClass(baseUrl, serviceKey, classId, userId)
  if (!owns) return c.json({ message: 'Class not found or access denied' }, 404)

  try {
    const result = await supabase.createLiveSession(baseUrl, serviceKey, {
      class_id: classId,
      teacher_id: userId,
      exercise_id: exerciseId,
    })
    return c.json({ session_id: result.id, code: result.code })
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

/** POST /api/live/join — 學生以代碼加入場次 */
app.post('/join', async (c) => {
  const studentId = c.get('studentId')
  if (!studentId) return c.json({ message: 'Student login required', code: 'student_required' }, 401)

  let body: { code?: string }
  try {
    body = (await c.req.json()) as typeof body
  } catch {
    return c.json({ message: 'Invalid JSON' }, 400)
  }
  const code = (body.code ?? '').trim().toUpperCase()
  if (!code) return c.json({ message: 'code required' }, 400)

  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY
  const session = await supabase.getLiveSessionByCode(baseUrl, serviceKey, code)
  if (!session) return c.json({ message: '無效或已結束的課堂代碼', code: 'invalid_code' }, 404)

  const result = await supabase.joinLiveSession(baseUrl, serviceKey, session.id, studentId)
  // #region agent log
  fetch('http://127.0.0.1:7246/ingest/ce4da3a2-50de-4590-a46a-3e3626a1067e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5fd7ac'},body:JSON.stringify({sessionId:'5fd7ac',location:'live.ts:join',message:'joinResult',data:{sessionClassId:session.class_id,studentId,result,status:session.status},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
  // #endregion
  if (result === 'session_not_waiting') {
    return c.json({ message: '測驗已開始或已結束，無法加入', code: 'session_not_waiting' }, 403)
  }
  if (result === 'wrong_class') {
    return c.json({ message: '您不在本班，無法加入此課堂測驗', code: 'wrong_class' }, 403)
  }
  if (result === 'already_joined') {
    return c.json({ session_id: session.id, exercise_id: session.exercise_id, already_joined: true })
  }
  return c.json({ session_id: session.id, exercise_id: session.exercise_id })
})

/** GET /api/live/session/:id — 取得場次詳情（教師或已加入的學生） */
app.get('/session/:id', async (c) => {
  const sessionId = c.req.param('id')
  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY

  const session = await supabase.getLiveSessionById(baseUrl, serviceKey, sessionId)
  if (!session) return c.json({ message: 'Not found' }, 404)

  const userId = c.get('userId')
  const studentId = c.get('studentId')
  if (studentId) {
    const partUrl = `${baseUrl.replace(/\/$/, '')}/rest/v1/live_participants?session_id=eq.${sessionId}&student_id=eq.${studentId}&select=id`
    const partRes = await supabase.supabaseFetch(partUrl, serviceKey)
    if (!partRes.ok) return c.json({ message: 'Not found' }, 404)
    const rows = (await partRes.json()) as Array<{ id: string }>
    if (rows.length === 0) return c.json({ message: 'Not joined' }, 403)
  } else if (userId) {
    if (session.teacher_id !== userId) return c.json({ message: 'Access denied' }, 403)
  } else {
    return c.json({ message: 'Unauthorized' }, 401)
  }

  return c.json(session)
})

/** PATCH /api/live/session/:id — 教師更新場次狀態（started / ended） */
app.patch('/session/:id', async (c) => {
  if (c.get('studentId')) return c.json({ message: 'Teachers only' }, 403)
  const userId = c.get('userId') ?? null
  if (!userId) return c.json({ message: 'Unauthorized' }, 401)

  const sessionId = c.req.param('id')
  let body: { status?: string }
  try {
    body = (await c.req.json()) as typeof body
  } catch {
    return c.json({ message: 'Invalid JSON' }, 400)
  }
  const status = body.status === 'started' || body.status === 'ended' ? body.status : null
  if (!status) return c.json({ message: 'status must be started or ended' }, 400)

  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY
  const ok = await supabase.updateLiveSessionStatus(baseUrl, serviceKey, sessionId, userId, status)
  if (!ok) return c.json({ message: 'Not found or access denied' }, 404)
  return c.json({ status })
})

/** GET /api/live/session-by-code?code=XXX — 學生查詢代碼對應的場次（僅回傳 status 與 exercise_id，供前端判斷是否可加入） */
app.get('/session-by-code', async (c) => {
  const code = c.req.query('code')?.trim().toUpperCase()
  if (!code) return c.json({ message: 'code required' }, 400)

  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY
  const session = await supabase.getLiveSessionByCode(baseUrl, serviceKey, code)
  if (!session) return c.json({ message: '無效或已結束的課堂代碼', code: 'invalid_code' }, 404)
  return c.json({ session_id: session.id, exercise_id: session.exercise_id, status: session.status })
})

export const liveRoutes = app
