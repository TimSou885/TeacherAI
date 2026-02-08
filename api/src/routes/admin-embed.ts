import { Hono } from 'hono'
import { getEmbedding } from '../services/azure-openai'
import * as supabase from '../services/supabase'
import { insertVectors } from '../services/vectorize'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

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

export const adminEmbedRoutes = app
