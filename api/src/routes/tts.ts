import { Hono } from 'hono'
import { synthesizeWithPolly } from '../services/polly'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

function safeKeySegment(text: string): string {
  return encodeURIComponent(text.replace(/[/\\?*]/g, '_').slice(0, 200))
}

/** POST /api/tts — 合成語音，回傳播放 URL（R2 快取或 Polly 生成後存 R2） */
app.post('/tts', async (c) => {
  let body: { text?: string; voiceId?: string; speed?: 'slow' | 'medium' }
  try {
    body = (await c.req.json()) as typeof body
  } catch {
    return c.json({ message: 'Invalid JSON' }, 400)
  }
  const text = (body.text ?? '').trim()
  if (!text) return c.json({ message: 'text is required' }, 400)
  const voiceId = body.voiceId ?? 'Zhiyu'
  const speed = body.speed ?? 'medium'
  const cacheKey = `tts/${voiceId}/${speed}/${safeKeySegment(text)}.mp3`
  const origin = new URL(c.req.url).origin
  const playUrl = `${origin}/api/tts/play?k=${encodeURIComponent(cacheKey)}`

  const r2 = c.env.R2_TTS
  if (r2) {
    const cached = await r2.get(cacheKey)
    if (cached) {
      return c.json({ url: playUrl })
    }
  }

  if (!c.env.AWS_ACCESS_KEY_ID || !c.env.AWS_SECRET_ACCESS_KEY) {
    return c.json({ message: 'TTS not configured (missing AWS credentials)' }, 503)
  }

  try {
    const audioBuffer = await synthesizeWithPolly(
      text,
      { voiceId, engine: 'neural', outputFormat: 'mp3', speed },
      {
        AWS_ACCESS_KEY_ID: c.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: c.env.AWS_SECRET_ACCESS_KEY,
        AWS_REGION: c.env.AWS_REGION,
      }
    )
    if (r2) {
      await r2.put(cacheKey, audioBuffer, {
        httpMetadata: { contentType: 'audio/mpeg' },
      })
      return c.json({ url: playUrl })
    }
    return new Response(audioBuffer, {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, max-age=3600' },
    })
  } catch (e) {
    return c.json({ message: (e as Error).message }, 502)
  }
})

/** GET /api/tts/play?k=key — 從 R2 串流音頻（供前端 <audio src="...">） */
app.get('/tts/play', async (c) => {
  const key = c.req.query('k')
  if (!key) return c.json({ message: 'k is required' }, 400)
  const r2 = c.env.R2_TTS
  if (!r2) return c.json({ message: 'TTS storage not configured' }, 503)
  const obj = await r2.get(key)
  if (!obj) return c.json({ message: 'Not found' }, 404)
  return new Response(obj.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=31536000',
    },
  })
})

export const ttsRoutes = app
