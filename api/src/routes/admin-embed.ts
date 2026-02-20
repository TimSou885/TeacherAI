import { Hono } from 'hono'
import { getEmbedding } from '../services/azure-openai'
import * as supabase from '../services/supabase'
import { insertVectors } from '../services/vectorize'
import { logCost, estimateTokens } from '../services/cost-tracker'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'
import type { Env } from '../index'
import type { AuthVariables } from '../middleware/auth'

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>()

/** POST /admin/embed：上傳課文段落並嵌入 Vectorize + 寫入 embeddings_log（需帶 X-Admin-Embed-Secret） */
app.post('/embed', async (c) => {
  const headerSecret = (c.req.header('X-Admin-Embed-Secret') ?? '').trim()
  const envSecret = (c.env.ADMIN_EMBED_SECRET ?? '').trim()
  if (!envSecret || headerSecret !== envSecret) {
    return c.json({ message: 'Unauthorized' }, 401)
  }
  if (!c.env.VECTORIZE) {
    return c.json({ message: 'VECTORIZE not configured' }, 503)
  }
  let body: { chunks?: Array<{ id: string; text: string }> }
  try {
    body = (await c.req.json()) as typeof body
  } catch {
    return c.json({ message: 'Invalid JSON' }, 400)
  }
  const chunks = body.chunks ?? []
  if (chunks.length === 0) {
    return c.json({ message: 'chunks required (array of { id, text })' }, 400)
  }

  const endpoint = (c.env.AZURE_OPENAI_ENDPOINT ?? '').trim()
  const apiKey = (c.env.AZURE_OPENAI_API_KEY ?? '').trim()
  if (!endpoint || !apiKey) {
    return c.json({ message: 'Azure OpenAI not configured' }, 503)
  }

  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY
  const vectors: Array<{ id: string; values: number[]; text: string }> = []

  for (const chunk of chunks) {
    const id = (chunk.id ?? crypto.randomUUID()).toString()
    const text = (chunk.text ?? '').trim()
    if (!text) continue
    try {
      const values = await getEmbedding(endpoint, apiKey, text)
      vectors.push({ id, values, text })
      logCost(baseUrl, serviceKey, { service: 'azure_openai', model: 'text-embedding-3-small', input_tokens: estimateTokens(text) }).catch(() => {})
    } catch (e) {
      return c.json({ message: `Embedding failed for id ${id}: ${(e as Error).message}` }, 500)
    }
  }

  if (vectors.length > 0) {
    await insertVectors(c.env.VECTORIZE, vectors)
    for (const v of vectors) {
      await supabase.createEmbeddingLog(baseUrl, serviceKey, {
        content_type: 'text_chunk',
        subject: 'chinese',
        content_text: v.text,
        vector_id: v.id,
      })
    }
  }

  return c.json({ ok: true, inserted: vectors.length })
})

/** GET /admin/stats — 系統總覽（管理員） */
app.get('/stats', authMiddleware, adminMiddleware, async (c) => {
  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY
  try {
    const stats = await supabase.getAdminStats(baseUrl, serviceKey)
    return c.json(stats)
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

/** GET /admin/cost — 成本彙總（管理員，可選 ?month=YYYY-MM） */
app.get('/cost', authMiddleware, adminMiddleware, async (c) => {
  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY
  const month = c.req.query('month') ?? undefined
  try {
    const summary = await supabase.getCostSummary(baseUrl, serviceKey, month ? { month } : undefined)
    return c.json(summary)
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

/** GET /admin/conversation-flags — 對話標記列表（管理員，可選 ?status=pending） */
app.get('/conversation-flags', authMiddleware, adminMiddleware, async (c) => {
  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY
  const status = c.req.query('status') ?? undefined
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit'), 10) : 50
  try {
    const list = await supabase.listConversationFlags(baseUrl, serviceKey, {
      status: status || undefined,
      limit: Number.isFinite(limit) ? limit : 50,
    })
    return c.json({ flags: list })
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

export const adminEmbedRoutes = app
