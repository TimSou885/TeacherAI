import { createMiddleware } from 'hono/factory'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { Env } from '../index'

const getJwks = (supabaseUrl: string) =>
  createRemoteJWKSet(new URL(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`))

export const authMiddleware = createMiddleware<{ Bindings: Env; Variables: { userId: string } }>(
  async (c, next) => {
    if (c.req.method === 'OPTIONS') return next()
    const auth = c.req.header('Authorization')
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/ce4da3a2-50de-4590-a46a-3e3626a1067e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:entry',message:'auth middleware',data:{hasAuthHeader:!!auth,bearerPrefix:auth?.startsWith('Bearer '),tokenLength:token?.length ?? 0},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    if (!token) {
      return c.json({ message: 'Unauthorized', code: 'missing_token' }, 401)
    }
    const supabaseUrl = c.env.SUPABASE_URL
    if (!supabaseUrl) {
      return c.json({ message: 'Server config error' }, 500)
    }
    try {
      const jwks = getJwks(supabaseUrl)
      const { payload } = await jwtVerify(token, jwks)
      const sub = payload.sub
      if (!sub) {
        return c.json({ message: 'Invalid token' }, 401)
      }
      c.set('userId', sub)
      await next()
    } catch (e) {
      const err = e as Error
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/ce4da3a2-50de-4590-a46a-3e3626a1067e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:catch',message:'jwtVerify failed',data:{errorName:err?.name,errorMessage:err?.message},timestamp:Date.now(),hypothesisId:'H4_H5'})}).catch(()=>{});
      // #endregion
      return c.json({
        message: 'Invalid or expired token',
        code: 'jwt_verify_failed',
        detail: err?.name && err?.message ? `${err.name}: ${err.message}` : undefined,
      }, 401)
    }
  }
)
