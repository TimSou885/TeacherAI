import { createMiddleware } from 'hono/factory'
import * as supabase from '../services/supabase'
import type { Env } from '../index'
import type { AuthVariables } from './auth'

/** 驗證目前使用者為 admin_users 表內的管理員（須先跑 authMiddleware，且為老師 JWT 非學生） */
export const adminMiddleware = createMiddleware<{ Bindings: Env; Variables: AuthVariables }>(
  async (c, next) => {
    if (c.get('studentId')) {
      return c.json({ message: 'Admin only', code: 'student_forbidden' }, 403)
    }
    const userId = c.get('userId') ?? null
    if (!userId) {
      return c.json({ message: 'Unauthorized', code: 'missing_user' }, 401)
    }
    const baseUrl = c.env.SUPABASE_URL
    const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY
    const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/admin_users?user_id=eq.${userId}&select=id,role,display_name`
    const res = await supabase.supabaseFetch(url, serviceKey)
    if (!res.ok) {
      return c.json({ message: 'Admin check failed' }, 500)
    }
    const rows = (await res.json()) as Array<{ id: string; role: string; display_name: string }>
    if (rows.length === 0) {
      return c.json({ message: '需要管理員權限', code: 'not_admin' }, 403)
    }
    c.set('adminUserId', userId)
    c.set('adminRole', rows[0].role)
    c.set('adminDisplayName', rows[0].display_name)
    await next()
  }
)
