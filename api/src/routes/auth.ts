import { Hono } from 'hono'
import * as supabase from '../services/supabase'
import { signStudentJwt } from '../services/student-jwt'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

/** GET /api/auth/class-by-code?joinCode=xxx — 依班級代碼取得班級與學生名單（不需認證） */
app.get('/class-by-code', async (c) => {
  const joinCode = c.req.query('joinCode')?.trim()
  if (!joinCode) {
    return c.json({ message: '請提供班級代碼', code: 'missing_join_code' }, 400)
  }
  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY
  if (!baseUrl || !serviceKey) {
    return c.json({ message: 'Server config error' }, 500)
  }
  try {
    const result = await supabase.getClassByJoinCode(baseUrl, serviceKey, joinCode)
    if (!result) {
      return c.json({ message: '找不到該班級', code: 'class_not_found' }, 404)
    }
    return c.json({
      classId: result.classId,
      className: result.className,
      students: result.students.map((s) => ({
        id: s.id,
        name: s.name,
        displayName: s.display_name ?? s.name,
        gradeLevel: s.grade_level ?? 3,
      })),
    })
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

/** POST /api/auth/student-login — 驗證班級代碼 + 學生 ID，回傳學生 JWT */
app.post('/student-login', async (c) => {
  let body: { joinCode?: string; studentId?: string }
  try {
    body = (await c.req.json()) as typeof body
  } catch {
    return c.json({ message: 'Invalid JSON' }, 400)
  }
  const joinCode = body.joinCode?.trim()
  const studentId = body.studentId?.trim()
  if (!joinCode || !studentId) {
    return c.json({ message: '請提供班級代碼與學生', code: 'missing_params' }, 400)
  }
  const secret = c.env.STUDENT_JWT_SECRET
  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret || !baseUrl || !serviceKey) {
    return c.json({ message: 'Server config error' }, 500)
  }
  try {
    const student = await supabase.getStudentInClass(baseUrl, serviceKey, joinCode, studentId)
    if (!student) {
      return c.json({ message: '班級代碼或學生不正確', code: 'invalid_credentials' }, 401)
    }
    const token = await signStudentJwt(secret, {
      sub: student.id,
      role: 'student',
      class_id: student.class_id,
      school_id: student.school_id,
      name: student.display_name ?? student.name,
      grade_level: student.grade_level ?? 3,
    })
    return c.json({
      token,
      student: {
        id: student.id,
        name: student.display_name ?? student.name,
        classId: student.class_id,
        gradeLevel: student.grade_level ?? 3,
      },
    })
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

export const authRoutes = app
