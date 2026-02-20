import { Hono } from 'hono'
import { chatComplete } from '../services/azure-openai'
import { logCost, estimateTokens } from '../services/cost-tracker'
import type { Env } from '../index'
import type { AuthVariables } from '../middleware/auth'

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>()

/** POST /api/score — 簡答題 AI 輔助評分（GPT-4o-mini） */
app.post('/score', async (c) => {
  let body: {
    question?: string
    studentAnswer?: string
    referenceAnswer?: string
    scoringGuide?: string
    gradeLevel?: number
  }
  try {
    body = (await c.req.json()) as typeof body
  } catch {
    return c.json({ message: 'Invalid JSON' }, 400)
  }
  const question = (body.question ?? '').trim()
  const studentAnswer = (body.studentAnswer ?? '').trim()
  if (!question || !studentAnswer) {
    return c.json({ message: 'question and studentAnswer are required' }, 400)
  }
  const apiKey = c.env.AZURE_OPENAI_API_KEY
  const endpoint = c.env.AZURE_OPENAI_ENDPOINT
  if (!apiKey || !endpoint) {
    return c.json({ message: 'Scoring not configured' }, 503)
  }
  const gradeLevel = body.gradeLevel ?? 3
  const ref = (body.referenceAnswer ?? '').trim()
  const guide = (body.scoringGuide ?? '').trim()

  const systemPrompt = `你是一位小學${gradeLevel}年級的中文老師，正在批改學生的簡答題。
請根據題目與評分指引，對學生答案評分（0–100 分），並用一兩句話寫出簡短回饋（指出優點或可改進處）。
只輸出 JSON，格式：{"score": 85, "feedback": "回饋內容"}
不要輸出其他文字。`

  const userContent = `題目：${question}
參考答案：${ref || '（未提供）'}
評分指引：${guide || '言之有理即可'}
學生答案：${studentAnswer}

請輸出 JSON：{"score": 數字0-100, "feedback": "回饋字串"}`

  try {
    const raw = await chatComplete(endpoint, apiKey, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ], { max_tokens: 200 })
    const baseUrl = c.env.SUPABASE_URL
    const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY
    if (baseUrl && serviceKey) {
      logCost(baseUrl, serviceKey, { service: 'azure_openai', model: 'gpt-4o-mini', input_tokens: estimateTokens(systemPrompt) + estimateTokens(userContent), output_tokens: estimateTokens(raw) }).catch(() => {})
    }
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? (JSON.parse(jsonMatch) as { score?: number; feedback?: string }) : {}
    const score = Math.min(100, Math.max(0, Number(parsed.score) ?? 0))
    const feedback = typeof parsed.feedback === 'string' ? parsed.feedback : '已批改'
    return c.json({ score, feedback })
  } catch (e) {
    return c.json({ message: (e as Error).message }, 502)
  }
})

export const scoreRoutes = app
