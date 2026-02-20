import { Hono } from 'hono'
import * as supabase from '../services/supabase'
import { chatComplete } from '../services/azure-openai'
import { authMiddleware } from '../middleware/auth'
import type { Env } from '../index'
import type { AuthVariables } from '../middleware/auth'

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>()

// 在子 app 內再跑一次 auth，確保 handler 能讀到 userId（主 app 僅 Bindings 時 context 可能未傳遞 Variables）
app.use('*', authMiddleware)

/** GET /api/teacher/check-class?class_id=xxx — 除錯：回傳此班級 teacher_id 與目前老師是否擁有 */
app.get('/check-class', async (c) => {
  if (c.get('studentId')) return c.json({ message: 'Teachers only' }, 403)
  const userId = c.get('userId') ?? null
  if (!userId) return c.json({ message: 'Unauthorized', code: 'missing_teacher_id', your_user_id: null }, 401)
  const classId = c.req.query('class_id')
  if (!classId) return c.json({ message: 'class_id required' }, 400)
  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY
  const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/classes?id=eq.${classId}&select=id,name,teacher_id`
  const res = await supabase.supabaseFetch(url, serviceKey)
  if (!res.ok) return c.json({ message: 'Supabase error' }, 500)
  const rows = (await res.json()) as Array<{ id: string; name: string; teacher_id: string | null }>
  const row = rows[0] ?? null
  const a = (row?.teacher_id ?? '').trim().toLowerCase()
  const b = userId.trim().toLowerCase()
  const owns = row ? a.length > 0 && a === b : false
  return c.json({
    api_version: 'teacher-uuid-lowercase-v1',
    your_user_id: userId,
    class_id: classId,
    class_name: row?.name ?? null,
    class_teacher_id: row?.teacher_id ?? null,
    owns,
  })
})

/** GET /api/teacher/me — 回傳目前登入老師的 user_id（用於顯示「請設 teacher_id」時） */
app.get('/me', async (c) => {
  if (c.get('studentId')) {
    return c.json({ message: 'Teachers only' }, 403)
  }
  const userId = c.get('userId')
  if (!userId) return c.json({ message: 'Unauthorized' }, 401)
  return c.json({ user_id: userId })
})

/** GET /api/teacher/dashboard?class_id=xxx — 班級儀表板統計（僅教師且須擁有該班） */
app.get('/dashboard', async (c) => {
  const studentId = c.get('studentId')
  if (studentId) {
    return c.json({ message: 'Teachers only', code: 'student_forbidden' }, 403)
  }
  const userId = c.get('userId') ?? null
  const classId = c.req.query('class_id')
  if (!userId) {
    return c.json({ message: 'Unauthorized', code: 'missing_teacher_id', your_user_id: null }, 401)
  }
  if (!classId) {
    return c.json({ message: 'class_id required' }, 400)
  }

  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY

  const owns = await supabase.verifyTeacherOwnsClass(baseUrl, serviceKey, classId, userId)
  if (!owns) {
    return c.json({
      message: '此班級不存在或您沒有權限查看。若班級剛建立，請在 Supabase 將該班級的 teacher_id 設為您的使用者 ID。',
      code: 'class_not_owned',
      your_user_id: userId,
    }, 404)
  }

  try {
    const stats = await supabase.getClassDashboardStats(baseUrl, serviceKey, classId)
    return c.json(stats)
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

/** POST /api/teacher/claim-class — 認領班級（僅當 teacher_id 為 null 時寫入） */
app.post('/claim-class', async (c) => {
  if (c.get('studentId')) {
    return c.json({ message: 'Teachers only', code: 'student_forbidden' }, 403)
  }
  const userId = c.get('userId') ?? null
  if (!userId) {
    return c.json({ message: 'Unauthorized', code: 'missing_teacher_id', your_user_id: null }, 401)
  }
  let body: { class_id?: string }
  try {
    body = (await c.req.json()) as { class_id?: string }
  } catch {
    return c.json({ message: 'Invalid JSON' }, 400)
  }
  const classId = body.class_id
  if (!classId) return c.json({ message: 'class_id required' }, 400)

  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY
  const result = await supabase.claimClassForTeacher(baseUrl, serviceKey, classId, userId)

  if (result === 'owned_by_other') {
    return c.json({
      message: '此班級已由其他老師負責，無法認領。若您應為負責老師，請在 Supabase 的 classes 表將該班級的 teacher_id 設為您的使用者 ID。',
      code: 'owned_by_other',
      your_user_id: userId,
    }, 403)
  }
  return c.json({ claimed: result === 'claimed' })
})

/** GET /api/teacher/students?class_id=xxx — 班級學生列表（僅教師且須擁有該班） */
app.get('/students', async (c) => {
  if (c.get('studentId')) {
    return c.json({ message: 'Teachers only', code: 'student_forbidden' }, 403)
  }
  const userId = c.get('userId') ?? null
  if (!userId) {
    return c.json({ message: 'Unauthorized', code: 'missing_teacher_id', your_user_id: null }, 401)
  }
  const classId = c.req.query('class_id')
  if (!classId) return c.json({ message: 'class_id required' }, 400)

  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY

  const owns = await supabase.verifyTeacherOwnsClass(baseUrl, serviceKey, classId, userId)
  if (!owns) return c.json({ message: 'Class not found or access denied' }, 404)

  try {
    const students = await supabase.listStudentsByClassId(baseUrl, serviceKey, classId)
    return c.json({ students })
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

/** GET /api/teacher/class-weakness?class_id=xxx — 班級弱項分析（六大範疇健康度、高頻錯題 TOP5、AI 教學建議） */
app.get('/class-weakness', async (c) => {
  if (c.get('studentId')) {
    return c.json({ message: 'Teachers only', code: 'student_forbidden' }, 403)
  }
  const userId = c.get('userId') ?? null
  if (!userId) {
    return c.json({ message: 'Unauthorized', code: 'missing_teacher_id', your_user_id: null }, 401)
  }
  const classId = c.req.query('class_id')
  if (!classId) return c.json({ message: 'class_id required' }, 400)

  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY

  const owns = await supabase.verifyTeacherOwnsClass(baseUrl, serviceKey, classId, userId)
  if (!owns) {
    return c.json({ message: '此班級不存在或您沒有權限查看。', code: 'class_not_owned' }, 404)
  }

  try {
    const { categoryStats, topErrors, summaryForAi } = await supabase.getClassWeaknessStats(
      baseUrl,
      serviceKey,
      classId
    )

    let aiSuggestion: string | null = null
    const endpoint = (c.env.AZURE_OPENAI_ENDPOINT ?? '').trim()
    const apiKey = (c.env.AZURE_OPENAI_API_KEY ?? '').trim()
    if (endpoint && apiKey && summaryForAi) {
      try {
        aiSuggestion = await chatComplete(endpoint, apiKey, [
          {
            role: 'system',
            content:
              '你是小學中文科教學顧問。根據班級錯題數據，用 1～2 句話給出具體教學建議（例如加強哪個範疇、哪些題型）。只輸出建議內容，不要標題或前言。',
          },
          {
            role: 'user',
            content: `本班待複習錯題摘要：\n${summaryForAi}\n\n請給出簡短教學建議（1～2 句）：`,
          },
        ], { max_tokens: 150 })
        aiSuggestion = aiSuggestion.trim() || null
      } catch {
        // 忽略 AI 失敗，照常回傳數據
      }
    }

    return c.json({
      categoryStats,
      topErrors,
      aiSuggestion,
    })
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

export const teacherRoutes = app
