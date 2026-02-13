import { Hono } from 'hono'
import { chatComplete } from '../services/azure-openai'
import * as supabase from '../services/supabase'
import {
  generateExercisePrompt,
  generateFromErrorsPrompt,
  type GenerateCategory,
} from '../subjects/chinese/prompts/generate-exercise'
import type { Env } from '../index'
import type { AuthVariables } from '../middleware/auth'

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>()

/** GET /api/classes — 教師的班級列表 */
app.get('/classes', async (c) => {
  if (c.get('studentId')) {
    return c.json({ message: 'Teachers only', code: 'student_forbidden' }, 403)
  }
  const userId = c.get('userId')
  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY
  try {
    const classes = await supabase.listClassesByTeacher(baseUrl, serviceKey, userId)
    return c.json({ classes })
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

const ALL_CATEGORIES: GenerateCategory[] = ['reading', 'grammar', 'vocabulary', 'dictation', 'reorder']

const CATEGORY_QUESTION_COUNTS: Record<GenerateCategory, number> = {
  reading: 5,
  grammar: 5,
  vocabulary: 5,
  dictation: 12,
  reorder: 2,
}

function parseGeneratedJson(raw: string): unknown {
  const trimmed = raw.trim()
  const jsonMatch = trimmed.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('AI 未回傳有效 JSON')
  return JSON.parse(jsonMatch[0]) as unknown
}

/** POST /api/generate — AI 自動出題（僅教師） */
app.post('/generate', async (c) => {
  if (c.get('studentId')) {
    return c.json({ message: 'Teachers only', code: 'student_forbidden' }, 403)
  }

  const userId = c.get('userId')
  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY
  const endpoint = (c.env.AZURE_OPENAI_ENDPOINT ?? '').trim()
  const apiKey = (c.env.AZURE_OPENAI_API_KEY ?? '').trim()
  if (!endpoint || !apiKey) {
    return c.json({ message: 'Azure OpenAI 未設定' }, 503)
  }

  let body: {
    source_text?: string
    category?: GenerateCategory | 'all'
    class_id?: string
    grade_level?: number
    mode?: 'lesson' | 'error_book'
  }
  try {
    body = (await c.req.json()) as typeof body
  } catch {
    return c.json({ message: 'Invalid JSON' }, 400)
  }

  const classId = body.class_id
  if (!classId) return c.json({ message: 'class_id required' }, 400)
  const gradeLevel = Math.min(6, Math.max(1, body.grade_level ?? 3))
  const mode = body.mode ?? 'lesson'

  if (mode === 'error_book') {
    const summary = await supabase.getClassErrorBookSummary(baseUrl, serviceKey, classId)
    const prompt = generateFromErrorsPrompt({
      errorSummary: summary,
      gradeLevel,
      questionCount: 10,
    })
    try {
      const raw = await chatComplete(c.env.AZURE_OPENAI_ENDPOINT!, c.env.AZURE_OPENAI_API_KEY!, [
        { role: 'system', content: '你只輸出 JSON，不要 markdown 或額外說明。' },
        { role: 'user', content: prompt },
      ], { max_tokens: 2000 })
      let content = parseGeneratedJson(raw)
      if (Array.isArray(content)) {
        content = { type: 'quiz', questions: content }
      }
      const id = await supabase.createAiGeneratedContent(baseUrl, serviceKey, {
        class_id: classId,
        category: 'error_review',
        source_text: summary,
        generated_content: content,
        teacher_id: userId,
      })
      return c.json({ id, generated_content: content })
    } catch (e) {
      return c.json({ message: (e as Error).message }, 500)
    }
  }

  const sourceText = (body.source_text ?? '').trim()
  if (!sourceText) return c.json({ message: 'source_text required for lesson mode' }, 400)

  const category = body.category
  if (category === 'all') {
    const results: Array<{ category: GenerateCategory; id: string; generated_content: unknown }> = []
    const prompts = ALL_CATEGORIES.map((cat) => ({
      category: cat as GenerateCategory,
      prompt: generateExercisePrompt({
        lessonText: sourceText,
        gradeLevel,
        category: cat as GenerateCategory,
        questionCount: CATEGORY_QUESTION_COUNTS[cat as GenerateCategory],
      }),
    }))
    for (const { category: cat, prompt } of prompts) {
      try {
        const raw = await chatComplete(endpoint, apiKey, [
          { role: 'system', content: '你只輸出 JSON，不要 markdown 或額外說明。' },
          { role: 'user', content: prompt },
        ], { max_tokens: 1500 })
        let content = parseGeneratedJson(raw)
        if (cat === 'dictation' && typeof content === 'object' && content !== null && 'words' in (content as object)) {
          content = { type: 'dictation', words: (content as { words: unknown }).words }
        } else if (!Array.isArray(content) && typeof content === 'object') {
          content = content
        } else if (Array.isArray(content)) {
          content = { type: 'quiz', questions: content }
        }
        const id = await supabase.createAiGeneratedContent(baseUrl, serviceKey, {
          class_id: classId,
          category: cat,
          source_text: sourceText,
          generated_content: content,
          teacher_id: userId,
        })
        results.push({ category: cat, id, generated_content: content })
      } catch (e) {
        results.push({
          category: cat,
          id: '',
          generated_content: { error: (e as Error).message },
        })
      }
    }
    return c.json({ batch: true, results })
  }

  const cat = (category ?? 'reading') as GenerateCategory
  if (!ALL_CATEGORIES.includes(cat)) {
    return c.json({ message: 'Invalid category' }, 400)
  }

  const prompt = generateExercisePrompt({
    lessonText: sourceText,
    gradeLevel,
    category: cat,
    questionCount: CATEGORY_QUESTION_COUNTS[cat] ?? 5,
  })

  try {
    const raw = await chatComplete(endpoint, apiKey, [
      { role: 'system', content: '你只輸出 JSON，不要 markdown 或額外說明。' },
      { role: 'user', content: prompt },
    ], { max_tokens: 1500 })
    let content = parseGeneratedJson(raw)
    if (cat === 'dictation' && typeof content === 'object' && content !== null && 'words' in (content as object)) {
      content = content
    } else if (Array.isArray(content)) {
      content = { type: 'quiz', questions: content }
    }
    const id = await supabase.createAiGeneratedContent(baseUrl, serviceKey, {
      class_id: classId,
      category: cat,
      source_text: sourceText,
      generated_content: content,
      teacher_id: userId,
    })
    return c.json({ id, generated_content: content })
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

/** POST /api/generate/publish — 審核通過，發佈為練習 */
app.post('/generate/publish', async (c) => {
  if (c.get('studentId')) {
    return c.json({ message: 'Teachers only', code: 'student_forbidden' }, 403)
  }

  let body: { draft_id: string; title: string; approved_content?: unknown }
  try {
    body = (await c.req.json()) as typeof body
  } catch {
    return c.json({ message: 'Invalid JSON' }, 400)
  }

  const draftId = body.draft_id
  const title = (body.title ?? '').trim()
  if (!draftId || !title) return c.json({ message: 'draft_id and title required' }, 400)

  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY
  const draft = await supabase.getAiGeneratedContentById(baseUrl, serviceKey, draftId)
  if (!draft) return c.json({ message: 'Draft not found' }, 404)
  if (draft.status !== 'draft') return c.json({ message: 'Draft already processed' }, 400)

  const content = body.approved_content ?? draft.generated_content
  let questions: unknown[] = []
  let category = draft.category

  if (typeof content === 'object' && content !== null) {
    const C = content as Record<string, unknown>
    if (Array.isArray(C.questions)) {
      questions = C.questions
    } else if (Array.isArray(C.words) && draft.category === 'dictation') {
      questions = C.words as unknown[]
      category = 'dictation'
    } else if (Array.isArray(content)) {
      questions = content as unknown[]
    }
  }

  const exerciseId = await supabase.insertExercise(baseUrl, serviceKey, {
    class_id: draft.class_id,
    title,
    category,
    questions,
  })
  await supabase.updateAiGeneratedContent(baseUrl, serviceKey, draftId, {
    status: 'approved',
    approved_content: content,
    approved_at: new Date().toISOString(),
  })
  return c.json({ exercise_id: exerciseId })
})

export const generateRoutes = app
