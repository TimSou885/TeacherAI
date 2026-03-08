import { Hono } from 'hono'
import { chatComplete } from '../services/azure-openai'
import * as supabase from '../services/supabase'
import {
  generateScriptPrompt,
  generateTimeSuggestPrompt,
  generatePropsListPrompt,
  generateBoardLayoutPrompt,
  parseDocumentPrompt,
  generateValueClimaxPrompt,
  generateHomeworkPrompt,
  generateKeyQuestionsPrompt,
  generateAssessmentPrompt,
} from '../subjects/chinese/prompts/lesson-plan'
import type { Env } from '../index'
import type { AuthVariables } from '../middleware/auth'

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>()

/** GET /api/lesson-plans — 教師的教案列表 */
app.get('/lesson-plans', async (c) => {
  if (c.get('studentId')) {
    return c.json({ message: 'Teachers only', code: 'student_forbidden' }, 403)
  }
  const userId = c.get('userId')
  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY
  try {
    const items = await supabase.listLessonPlans(baseUrl, serviceKey, userId)
    return c.json({ items })
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

/** GET /api/lesson-plans/:id — 取得單一教案 */
app.get('/lesson-plans/:id', async (c) => {
  if (c.get('studentId')) {
    return c.json({ message: 'Teachers only', code: 'student_forbidden' }, 403)
  }
  const userId = c.get('userId')
  const id = c.req.param('id')
  const baseUrl = (c.env.SUPABASE_URL ?? '').trim()
  const serviceKey = (c.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()
  if (!baseUrl || !serviceKey) {
    return c.json({ message: 'Server config error: Supabase not configured' }, 500)
  }
  try {
    const plan = await supabase.getLessonPlanById(baseUrl, serviceKey, id, userId)
    if (!plan) {
      const exists = await supabase.checkLessonPlanExists(baseUrl, serviceKey, id)
      if (exists) {
        return c.json({ message: '此教案屬於其他帳號，無法開啟' }, 403)
      }
      return c.json({ message: 'Not found' }, 404)
    }
    return c.json(plan)
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

/** POST /api/lesson-plans — 建立或更新教案 */
app.post('/lesson-plans', async (c) => {
  if (c.get('studentId')) {
    return c.json({ message: 'Teachers only', code: 'student_forbidden' }, 403)
  }
  const userId = c.get('userId')
  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY
  let body: {
    id?: string
    title: string
    source_text?: string
    class_id?: string
    grade_level?: number
    duration_minutes?: number
    strategy_type?: string
    blocks: unknown
    student_profile?: string
    textbook_ref?: string
    core_concept?: string
    core_question?: string
    key_questions?: string[]
    plan_mode?: 'detailed' | 'brief'
    assessment_design?: string
  }
  try {
    body = (await c.req.json()) as typeof body
  } catch {
    return c.json({ message: 'Invalid JSON' }, 400)
  }
  if (!body.title?.trim() || !Array.isArray(body.blocks)) {
    return c.json({ message: 'title and blocks required' }, 400)
  }
  try {
    const id = await supabase.upsertLessonPlan(baseUrl, serviceKey, {
      teacher_id: userId,
      id: body.id,
      title: body.title.trim(),
      source_text: body.source_text?.trim() || null,
      class_id: body.class_id || null,
      grade_level: body.grade_level ?? 3,
      duration_minutes: body.duration_minutes ?? 40,
      strategy_type: body.strategy_type || null,
      blocks: body.blocks,
      student_profile: body.student_profile?.trim() || null,
      textbook_ref: body.textbook_ref?.trim() || null,
      core_concept: body.core_concept?.trim() || null,
      core_question: body.core_question?.trim() || null,
      key_questions: Array.isArray(body.key_questions) ? body.key_questions : null,
      plan_mode: body.plan_mode === 'brief' ? 'brief' : 'detailed',
      assessment_design: body.assessment_design?.trim() || null,
    })
    return c.json({ id })
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

/** POST /api/lesson-plans/generate-script — AI 生成師生對話腳本 */
app.post('/lesson-plans/generate-script', async (c) => {
  if (c.get('studentId')) {
    return c.json({ message: 'Teachers only', code: 'student_forbidden' }, 403)
  }
  const endpoint = (c.env.AZURE_OPENAI_ENDPOINT ?? '').trim()
  const apiKey = (c.env.AZURE_OPENAI_API_KEY ?? '').trim()
  if (!endpoint || !apiKey) {
    return c.json({ message: 'Azure OpenAI 未設定' }, 503)
  }
  let body: {
    block_type: string
    activity: string
    source_text: string
    grade_level?: number
    duration_minutes?: number
    extra_context?: string
    student_profile?: string
  }
  try {
    body = (await c.req.json()) as typeof body
  } catch {
    return c.json({ message: 'Invalid JSON' }, 400)
  }
  if (!body.source_text?.trim()) {
    return c.json({ message: 'source_text required' }, 400)
  }
  const prompt = generateScriptPrompt({
    blockType: body.block_type || '新授',
    activity: body.activity || '師生討論',
    sourceText: body.source_text.trim(),
    gradeLevel: Math.min(6, Math.max(1, body.grade_level ?? 3)),
    durationMinutes: body.duration_minutes ?? 5,
    extraContext: body.extra_context,
    studentProfile: body.student_profile,
  })
  try {
    const raw = await chatComplete(endpoint, apiKey, [
      { role: 'system' as const, content: '你只輸出 JSON 陣列，不要 markdown 或額外說明。' },
      { role: 'user' as const, content: prompt },
    ], { max_tokens: 1500 })
    const trimmed = raw.trim()
    const jsonMatch = trimmed.match(/\[[\s\S]*\]/)
    const script = jsonMatch ? (JSON.parse(jsonMatch[0]) as Array<{ role: string; content: string; action?: string }>) : []
    return c.json({ script })
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

/** POST /api/lesson-plans/suggest-times — AI 建議各環節時間 */
app.post('/lesson-plans/suggest-times', async (c) => {
  if (c.get('studentId')) return c.json({ message: 'Teachers only' }, 403)
  const endpoint = (c.env.AZURE_OPENAI_ENDPOINT ?? '').trim()
  const apiKey = (c.env.AZURE_OPENAI_API_KEY ?? '').trim()
  if (!endpoint || !apiKey) return c.json({ message: 'Azure OpenAI 未設定' }, 503)
  let body: { blocks: Array<{ type: string; activity: string }>; total_minutes: number; grade_level?: number }
  try { body = (await c.req.json()) as typeof body } catch { return c.json({ message: 'Invalid JSON' }, 400) }
  if (!Array.isArray(body.blocks) || body.blocks.length === 0) return c.json({ message: 'blocks required' }, 400)
  const prompt = generateTimeSuggestPrompt({
    blocks: body.blocks,
    totalMinutes: body.total_minutes ?? 40,
    gradeLevel: Math.min(6, Math.max(1, body.grade_level ?? 3)),
  })
  try {
    const raw = await chatComplete(endpoint, apiKey, [
      { role: 'system' as const, content: '你只輸出 JSON 陣列。' },
      { role: 'user' as const, content: prompt },
    ], { max_tokens: 200 })
    const match = raw.trim().match(/\[[\s\S]*\]/)
    const times = match ? (JSON.parse(match[0]) as number[]) : []
    return c.json({ times })
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

/** POST /api/lesson-plans/generate-props — AI 生成教具清單 */
app.post('/lesson-plans/generate-props', async (c) => {
  if (c.get('studentId')) return c.json({ message: 'Teachers only' }, 403)
  const endpoint = (c.env.AZURE_OPENAI_ENDPOINT ?? '').trim()
  const apiKey = (c.env.AZURE_OPENAI_API_KEY ?? '').trim()
  if (!endpoint || !apiKey) return c.json({ message: 'Azure OpenAI 未設定' }, 503)
  let body: { source_text: string; blocks: Array<{ type: string; activity: string }>; grade_level?: number }
  try { body = (await c.req.json()) as typeof body } catch { return c.json({ message: 'Invalid JSON' }, 400) }
  if (!body.source_text?.trim()) return c.json({ message: 'source_text required' }, 400)
  const prompt = generatePropsListPrompt({
    sourceText: body.source_text,
    blocks: body.blocks ?? [],
    gradeLevel: Math.min(6, Math.max(1, body.grade_level ?? 3)),
  })
  try {
    const raw = await chatComplete(endpoint, apiKey, [
      { role: 'system' as const, content: '你只輸出 JSON 陣列。' },
      { role: 'user' as const, content: prompt },
    ], { max_tokens: 500 })
    const match = raw.trim().match(/\[[\s\S]*\]/)
    const props = match ? (JSON.parse(match[0]) as string[]) : []
    return c.json({ props })
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

/** POST /api/lesson-plans/generate-board — AI 生成板書結構 */
app.post('/lesson-plans/generate-board', async (c) => {
  if (c.get('studentId')) return c.json({ message: 'Teachers only' }, 403)
  const endpoint = (c.env.AZURE_OPENAI_ENDPOINT ?? '').trim()
  const apiKey = (c.env.AZURE_OPENAI_API_KEY ?? '').trim()
  if (!endpoint || !apiKey) return c.json({ message: 'Azure OpenAI 未設定' }, 503)
  let body: { source_text: string; blocks: Array<{ type: string; activity: string }>; grade_level?: number }
  try { body = (await c.req.json()) as typeof body } catch { return c.json({ message: 'Invalid JSON' }, 400) }
  if (!body.source_text?.trim()) return c.json({ message: 'source_text required' }, 400)
  const prompt = generateBoardLayoutPrompt({
    sourceText: body.source_text,
    blocks: body.blocks ?? [],
    gradeLevel: Math.min(6, Math.max(1, body.grade_level ?? 3)),
  })
  try {
    const raw = await chatComplete(endpoint, apiKey, [
      { role: 'system' as const, content: '直接輸出板書內容，不要 JSON 或 markdown。' },
      { role: 'user' as const, content: prompt },
    ], { max_tokens: 800 })
    return c.json({ board: raw.trim() })
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

/** POST /api/lesson-plans/parse-document — AI 解析文件擷取教學目標等 */
app.post('/lesson-plans/parse-document', async (c) => {
  if (c.get('studentId')) return c.json({ message: 'Teachers only' }, 403)
  const endpoint = (c.env.AZURE_OPENAI_ENDPOINT ?? '').trim()
  const apiKey = (c.env.AZURE_OPENAI_API_KEY ?? '').trim()
  if (!endpoint || !apiKey) return c.json({ message: 'Azure OpenAI 未設定' }, 503)
  let body: { text: string }
  try { body = (await c.req.json()) as typeof body } catch { return c.json({ message: 'Invalid JSON' }, 400) }
  if (!body.text?.trim()) return c.json({ message: 'text required' }, 400)
  const prompt = parseDocumentPrompt(body.text)
  try {
    const raw = await chatComplete(endpoint, apiKey, [
      { role: 'system' as const, content: '你只輸出 JSON 物件。' },
      { role: 'user' as const, content: prompt },
    ], { max_tokens: 800 })
    const match = raw.trim().match(/\{[\s\S]*\}/)
    const parsed = match ? (JSON.parse(match[0]) as {
      learning_objectives?: string[]
      key_vocabulary?: string[]
      core_values?: string
      core_concept?: string
      core_question?: string
    }) : {}
    return c.json(parsed)
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

/** POST /api/lesson-plans/generate-climax — AI 生成價值觀昇華結語 */
app.post('/lesson-plans/generate-climax', async (c) => {
  if (c.get('studentId')) return c.json({ message: 'Teachers only' }, 403)
  const endpoint = (c.env.AZURE_OPENAI_ENDPOINT ?? '').trim()
  const apiKey = (c.env.AZURE_OPENAI_API_KEY ?? '').trim()
  if (!endpoint || !apiKey) return c.json({ message: 'Azure OpenAI 未設定' }, 503)
  let body: { source_text: string; grade_level?: number; core_values?: string }
  try { body = (await c.req.json()) as typeof body } catch { return c.json({ message: 'Invalid JSON' }, 400) }
  if (!body.source_text?.trim()) return c.json({ message: 'source_text required' }, 400)
  const prompt = generateValueClimaxPrompt({
    sourceText: body.source_text,
    gradeLevel: Math.min(6, Math.max(1, body.grade_level ?? 3)),
    coreValues: body.core_values,
  })
  try {
    const raw = await chatComplete(endpoint, apiKey, [
      { role: 'system' as const, content: '直接輸出結語內容。' },
      { role: 'user' as const, content: prompt },
    ], { max_tokens: 400 })
    return c.json({ climax: raw.trim() })
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

/** POST /api/lesson-plans/generate-key-questions — AI 生成關鍵提問 */
app.post('/lesson-plans/generate-key-questions', async (c) => {
  if (c.get('studentId')) return c.json({ message: 'Teachers only' }, 403)
  const endpoint = (c.env.AZURE_OPENAI_ENDPOINT ?? '').trim()
  const apiKey = (c.env.AZURE_OPENAI_API_KEY ?? '').trim()
  if (!endpoint || !apiKey) return c.json({ message: 'Azure OpenAI 未設定' }, 503)
  let body: { source_text: string; blocks: Array<{ type: string; activity: string }>; grade_level?: number; core_question?: string }
  try { body = (await c.req.json()) as typeof body } catch { return c.json({ message: 'Invalid JSON' }, 400) }
  if (!body.source_text?.trim()) return c.json({ message: 'source_text required' }, 400)
  const prompt = generateKeyQuestionsPrompt({
    sourceText: body.source_text,
    blocks: body.blocks ?? [],
    gradeLevel: Math.min(6, Math.max(1, body.grade_level ?? 3)),
    coreQuestion: body.core_question?.trim(),
  })
  try {
    const raw = await chatComplete(endpoint, apiKey, [
      { role: 'system' as const, content: '你只輸出 JSON 陣列。' },
      { role: 'user' as const, content: prompt },
    ], { max_tokens: 500 })
    const match = raw.trim().match(/\[[\s\S]*\]/)
    const questions = match ? (JSON.parse(match[0]) as string[]) : []
    return c.json({ key_questions: questions })
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

/** POST /api/lesson-plans/generate-assessment — AI 生成評量設計 */
app.post('/lesson-plans/generate-assessment', async (c) => {
  if (c.get('studentId')) return c.json({ message: 'Teachers only' }, 403)
  const endpoint = (c.env.AZURE_OPENAI_ENDPOINT ?? '').trim()
  const apiKey = (c.env.AZURE_OPENAI_API_KEY ?? '').trim()
  if (!endpoint || !apiKey) return c.json({ message: 'Azure OpenAI 未設定' }, 503)
  let body: { source_text: string; blocks: Array<{ type: string; activity: string }>; grade_level?: number; learning_objectives?: string[] }
  try { body = (await c.req.json()) as typeof body } catch { return c.json({ message: 'Invalid JSON' }, 400) }
  if (!body.source_text?.trim()) return c.json({ message: 'source_text required' }, 400)
  const prompt = generateAssessmentPrompt({
    sourceText: body.source_text,
    blocks: body.blocks ?? [],
    gradeLevel: Math.min(6, Math.max(1, body.grade_level ?? 3)),
    learningObjectives: body.learning_objectives,
  })
  try {
    const raw = await chatComplete(endpoint, apiKey, [
      { role: 'system' as const, content: '直接輸出評量設計內容。' },
      { role: 'user' as const, content: prompt },
    ], { max_tokens: 600 })
    return c.json({ assessment_design: raw.trim() })
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

/** POST /api/lesson-plans/generate-homework — AI 生成作業與延伸 */
app.post('/lesson-plans/generate-homework', async (c) => {
  if (c.get('studentId')) return c.json({ message: 'Teachers only' }, 403)
  const endpoint = (c.env.AZURE_OPENAI_ENDPOINT ?? '').trim()
  const apiKey = (c.env.AZURE_OPENAI_API_KEY ?? '').trim()
  if (!endpoint || !apiKey) return c.json({ message: 'Azure OpenAI 未設定' }, 503)
  let body: { source_text: string; blocks: Array<{ type: string; activity: string }>; grade_level?: number }
  try { body = (await c.req.json()) as typeof body } catch { return c.json({ message: 'Invalid JSON' }, 400) }
  if (!body.source_text?.trim()) return c.json({ message: 'source_text required' }, 400)
  const prompt = generateHomeworkPrompt({
    sourceText: body.source_text,
    gradeLevel: Math.min(6, Math.max(1, body.grade_level ?? 3)),
    blocks: body.blocks ?? [],
  })
  try {
    const raw = await chatComplete(endpoint, apiKey, [
      { role: 'system' as const, content: '你只輸出 JSON 陣列。' },
      { role: 'user' as const, content: prompt },
    ], { max_tokens: 400 })
    const match = raw.trim().match(/\[[\s\S]*\]/)
    const homework = match ? (JSON.parse(match[0]) as string[]) : []
    return c.json({ homework })
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

export const lessonPlanRoutes = app
