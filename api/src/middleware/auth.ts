import { createMiddleware } from 'hono/factory'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { Env } from '../index'
import { verifyStudentJwt } from '../services/student-jwt'

export type AuthVariables = {
  userId: string
  /** 學生登入時為 student_id；老師登入時為 undefined */
  studentId?: string
  studentName?: string
  studentGradeLevel?: number
}

const getJwks = (supabaseUrl: string) =>
  createRemoteJWKSet(new URL(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`))

export const authMiddleware = createMiddleware<{ Bindings: Env; Variables: AuthVariables }>(
  async (c, next) => {
    if (c.req.method === 'OPTIONS') return next()
    const auth = c.req.header('Authorization')
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
    if (!token) {
      return c.json({ message: 'Unauthorized', code: 'missing_token' }, 401)
    }
    const supabaseUrl = c.env.SUPABASE_URL
    if (!supabaseUrl) {
      return c.json({ message: 'Server config error' }, 500)
    }
    // 1. 嘗試 Supabase JWT（老師）
    try {
      const jwks = getJwks(supabaseUrl)
      const { payload } = await jwtVerify(token, jwks)
      const sub = payload.sub
      if (sub) {
        c.set('userId', sub)
        await next()
        return
      }
    } catch {
      // 非 Supabase JWT，改試學生 JWT
    }
    // 2. 嘗試學生 JWT
    const studentSecret = c.env.STUDENT_JWT_SECRET
    if (studentSecret) {
      const studentPayload = await verifyStudentJwt(studentSecret, token)
      if (studentPayload) {
        c.set('userId', studentPayload.sub)
        c.set('studentId', studentPayload.sub)
        c.set('studentName', studentPayload.name)
        c.set('studentGradeLevel', studentPayload.grade_level)
        await next()
        return
      }
    }
    return c.json({
      message: 'Invalid or expired token',
      code: 'jwt_verify_failed',
    }, 401)
  }
)
