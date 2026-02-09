import { Hono } from 'hono'
import * as supabase from '../services/supabase'
import { chatComplete } from '../services/azure-openai'
import type { Env } from '../index'
import type { AuthVariables } from '../middleware/auth'

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>()

type Question = {
  type?: string
  question?: string
  options?: string[]
  correct?: number | string | boolean
  correct_order?: number[]
  left?: string[]
  right?: string[]
  correct_pairs?: number[][]
  reference_answer?: string
  scoring_guide?: string
  sentences?: string[]
}

function normalizeText(s: string): string {
  return s.trim().replace(/\s+/g, '').replace(/［/g, '[').replace(/［/g, ']').replace(/（/g, '(').replace(/）/g, ')')
}

function gradeQuestion(q: Question, studentValue: unknown): { isCorrect: boolean; correctAnswer?: string; feedback?: string } {
  const type = (q.type ?? '').toLowerCase()
  if (type === 'multiple_choice' || type === 'choice') {
    const correctIdx = Number(q.correct)
    const ans = typeof studentValue === 'number' ? studentValue : Number(studentValue)
    const isCorrect = !Number.isNaN(ans) && ans === correctIdx
    return { isCorrect, correctAnswer: q.options?.[correctIdx] }
  }
  if (type === 'fill_blank' || type === 'fill') {
    const correct = typeof q.correct === 'string' ? normalizeText(q.correct) : String(q.correct ?? '')
    const ans = typeof studentValue === 'string' ? normalizeText(studentValue) : normalizeText(String(studentValue ?? ''))
    return { isCorrect: ans === correct, correctAnswer: correct || undefined }
  }
  if (type === 'true_false' || type === 'judge') {
    const correct = Boolean(q.correct)
    const ans = studentValue === true || studentValue === false
      ? studentValue
      : String(studentValue).toLowerCase() === 'true' || String(studentValue) === '對' || Number(studentValue) === 1
    return { isCorrect: ans === correct, correctAnswer: correct ? '對' : '錯' }
  }
  if (type === 'reorder' || type === 'order') {
    const correctOrder = (q.correct_order ?? []).slice()
    const ans = Array.isArray(studentValue) ? studentValue : []
    const isCorrect = ans.length === correctOrder.length && ans.every((v, i) => Number(v) === correctOrder[i])
    return { isCorrect, correctAnswer: correctOrder.join(', ') }
  }
  if (type === 'matching' || type === 'match') {
    const pairs = (q.correct_pairs ?? []) as number[][]
    const ans = Array.isArray(studentValue) ? studentValue : []
    const normalized = pairs.map(([a, b]) => `${a},${b}`).sort().join(';')
    const studentNorm = ans.map((p: number[]) => `${p[0]},${p[1]}`).sort().join(';')
    return { isCorrect: normalized === studentNorm, correctAnswer: '配對正確' }
  }
  return { isCorrect: false }
}

/** GET /api/exercises?class_id=xxx&category=dictation — 列出練習（學生用 JWT 的 classId，老師用 query class_id） */
app.get('/exercises', async (c) => {
  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY
  const studentId = c.get('studentId')
  const classId = studentId ? c.get('classId') : c.req.query('class_id')
  if (!classId) {
    return c.json({ message: 'class_id required (or login as student)' }, 400)
  }
  const category = c.req.query('category')
  try {
    const list = await supabase.listExercises(baseUrl, serviceKey, classId, category ? { category } : undefined)
    return c.json({ exercises: list })
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

/** GET /api/exercises/:id — 取得單一練習（含 questions） */
app.get('/exercises/:id', async (c) => {
  const id = c.req.param('id')
  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY
  try {
    const exercise = await supabase.getExerciseById(baseUrl, serviceKey, id)
    if (!exercise) return c.json({ message: 'Not found' }, 404)
    return c.json(exercise)
  } catch (e) {
    return c.json({ message: (e as Error).message }, 500)
  }
})

/** POST /api/exercises/:id/submit — 提交答案、評分、寫入 attempt */
app.post('/exercises/:id/submit', async (c) => {
  const studentId = c.get('studentId')
  if (!studentId) return c.json({ message: 'Student login required', code: 'student_required' }, 401)
  const id = c.req.param('id')
  const baseUrl = c.env.SUPABASE_URL
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY
  let body: { answers?: Array<{ questionIndex: number; value: unknown }> }
  try {
    body = (await c.req.json()) as typeof body
  } catch {
    return c.json({ message: 'Invalid JSON' }, 400)
  }
  const answers = body.answers ?? []
  const exercise = await supabase.getExerciseById(baseUrl, serviceKey, id)
  if (!exercise) return c.json({ message: 'Not found' }, 404)
  const questions = (exercise.questions as Question[]) ?? []
  const results: Array<{ questionIndex: number; isCorrect: boolean; correctAnswer?: string; feedback?: string }> = []
  let correctCount = 0
  const gradeLevel = exercise.grade_level ?? 3

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    const ans = answers.find((a) => a.questionIndex === i)
    const studentValue = ans?.value
    if (q?.type === 'short_answer' || (q as Question).type === 'short_answer') {
      const question = (q as Question).question ?? ''
      const studentAnswer = typeof studentValue === 'string' ? studentValue : String(studentValue ?? '')
      if (!studentAnswer.trim()) {
        results.push({ questionIndex: i, isCorrect: false, correctAnswer: undefined, feedback: '未作答' })
        continue
      }
      try {
        const apiKey = c.env.AZURE_OPENAI_API_KEY
        const endpoint = c.env.AZURE_OPENAI_ENDPOINT
        if (!apiKey || !endpoint) {
          results.push({ questionIndex: i, isCorrect: false, feedback: '簡答評分未設定' })
          continue
        }
        const systemPrompt = `你是一位小學${gradeLevel}年級的中文老師，正在批改簡答題。只輸出 JSON：{"score": 0-100, "feedback": "回饋"}`
        const userContent = `題目：${question}\n參考：${(q as Question).reference_answer ?? ''}\n指引：${(q as Question).scoring_guide ?? '言之有理即可'}\n學生答案：${studentAnswer}`
        const raw = await chatComplete(c.env.AZURE_OPENAI_ENDPOINT, c.env.AZURE_OPENAI_API_KEY, [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ], { max_tokens: 200 })
        const jsonMatch = raw.match(/\{[\s\S]*\}/)
        const parsed = jsonMatch ? (JSON.parse(jsonMatch) as { score?: number; feedback?: string }) : {}
        const score = Math.min(100, Math.max(0, Number(parsed.score) ?? 0))
        const feedback = typeof parsed.feedback === 'string' ? parsed.feedback : '已批改'
        const isCorrect = score >= 60
        if (isCorrect) correctCount++
        results.push({ questionIndex: i, isCorrect, feedback })
      } catch (e) {
        results.push({ questionIndex: i, isCorrect: false, feedback: (e as Error).message })
      }
    } else {
      const { isCorrect, correctAnswer, feedback } = gradeQuestion(q as Question, studentValue)
      if (isCorrect) correctCount++
      results.push({ questionIndex: i, isCorrect, correctAnswer, feedback })
    }
  }

  const totalQuestions = questions.length
  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
  await supabase.insertExerciseAttempt(baseUrl, serviceKey, {
    exercise_id: id,
    student_id: studentId,
    answers: answers as unknown,
    score,
    total_questions: totalQuestions,
    correct_count: correctCount,
  })
  return c.json({
    score,
    totalQuestions,
    correctCount,
    results,
  })
})

export const exerciseRoutes = app
