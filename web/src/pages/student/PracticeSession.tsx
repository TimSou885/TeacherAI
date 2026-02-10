import { useState, useEffect } from 'react'
import { apiFetch, clearStudentSession, getStudentSession, isStudentToken } from '../../lib/api'

type Question =
  | { type: 'multiple_choice' | 'choice'; question: string; options?: string[]; correct?: number; display_type?: string }
  | { type: 'fill_blank' | 'fill'; question: string; correct?: string; hint?: string; display_type?: string }
  | { type: 'true_false' | 'judge'; question: string; correct?: boolean; explanation?: string; display_type?: string }
  | { type: 'reorder' | 'order'; sentences?: string[]; correct_order?: number[]; display_type?: string }
  | { type: 'matching' | 'match'; question?: string; left?: string[]; right?: string[]; correct_pairs?: number[][]; display_type?: string }
  | { type: 'short_answer'; question: string; reference_answer?: string; scoring_guide?: string; display_type?: string }

type SubmitResult = {
  questionIndex: number
  isCorrect: boolean
  correctAnswer?: string
  feedback?: string
}

export default function PracticeSession({
  exerciseId,
  title,
  onBack,
}: {
  exerciseId: string
  title: string
  onBack: () => void
}) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [answers, setAnswers] = useState<Record<number, unknown>>({})
  const [submitted, setSubmitted] = useState<SubmitResult[] | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError('')
    apiFetch(`/api/exercises/${exerciseId}`, undefined, { preferStudent: true })
      .then((res) => {
        if (!res.ok) throw new Error('無法載入題目')
        return res.json()
      })
      .then((data: { questions?: unknown[] }) => {
        setQuestions(Array.isArray(data.questions) ? (data.questions as Question[]) : [])
        setAnswers({})
        setSubmitted(null)
      })
      .catch((e) => setError(e instanceof Error ? e.message : '載入失敗'))
      .finally(() => setLoading(false))
  }, [exerciseId])

  function setAnswer(index: number, value: unknown) {
    setAnswers((prev) => ({ ...prev, [index]: value }))
  }

  async function handleSubmit() {
    const session = getStudentSession()
    if (!session?.token) {
      setError('請先登入學生帳號')
      return
    }
    if (!isStudentToken(session.token)) {
      clearStudentSession()
      setError('請重新以學生身分登入後再交卷（已清除舊登入）')
      return
    }
    const payload = questions.map((q, questionIndex) => {
      let value = answers[questionIndex]
      if ((q.type === 'reorder' || q.type === 'order') && (!Array.isArray(value) || value.length !== (q.sentences?.length ?? 0))) {
        value = (q.sentences ?? []).map((_, i) => i)
      }
      return { questionIndex, value: value ?? '' }
    })
    setSubmitting(true)
    setError('')
    try {
      const res = await apiFetch(`/api/exercises/${exerciseId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers: payload }),
      }, { token: session.token })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string; code?: string }
        let msg: string
        if (data.code === 'student_auth_not_configured' || res.status === 503) {
          msg = '伺服器未設定學生登入，請聯絡管理員'
        } else if (data.code === 'missing_token') {
          msg = '未帶登入憑證，請從首頁重新登入學生帳號'
        } else if (data.code === 'student_required') {
          clearStudentSession()
          msg = '請重新以學生身分登入後再交卷（已清除舊登入）'
        } else if (res.status === 401) {
          msg = '登入驗證失敗：請確認 API 已啟動（本機請執行 cd api && npm run dev）且已設定 STUDENT_JWT_SECRET'
        } else {
          msg = data.message ?? `提交失敗 ${res.status}`
        }
        throw new Error(msg)
      }
      const data = (await res.json()) as { results?: SubmitResult[] }
      setSubmitted(data.results ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交失敗')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="flex-1 overflow-auto p-6 text-amber-700">載入中…</div>
  if (error && questions.length === 0) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <p className="text-red-600 mb-4">{error}</p>
        <button type="button" onClick={onBack} className="text-amber-700 underline">返回</button>
      </div>
    )
  }

  const resultByIndex = submitted ? Object.fromEntries(submitted.map((r) => [r.questionIndex, r])) : null
  const score = submitted
    ? Math.round((submitted.filter((r) => r.isCorrect).length / Math.max(1, questions.length)) * 100)
    : null

  return (
    <div className="flex-1 overflow-auto p-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={onBack} className="text-amber-700 text-sm underline">← 返回</button>
        <h2 className="text-lg font-semibold text-amber-900 truncate max-w-[60%]">{title}</h2>
        <span />
      </div>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      {questions.length === 0 ? (
        <p className="text-amber-700">此練習尚無題目。</p>
      ) : (
        <>
          <div className="space-y-6 mb-6">
            {questions.map((q, i) => (
              <QuestionBlock
                key={i}
                index={i}
                question={q}
                value={answers[i]}
                onChange={(v) => setAnswer(i, v)}
                result={resultByIndex?.[i]}
              />
            ))}
          </div>
          {!submitted ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || Object.keys(answers).length < questions.length}
              className="min-h-[44px] px-6 py-3 rounded-xl bg-amber-500 text-white font-medium disabled:opacity-50 touch-manipulation"
            >
              {submitting ? '提交中…' : '交卷'}
            </button>
          ) : (
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
              <p className="font-medium text-amber-900">得分：{score} 分（{submitted.filter((r) => r.isCorrect).length} / {questions.length} 題正確）</p>
              <button type="button" onClick={onBack} className="mt-3 text-amber-700 underline text-sm">返回練習列表</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  multiple_choice: '選擇題',
  choice: '選擇題',
  fill_blank: '填空題',
  fill: '填空題',
  true_false: '判斷題',
  judge: '判斷題',
  reorder: '排序題',
  order: '排序題',
  matching: '配對題',
  match: '配對題',
  short_answer: '簡答題',
}

function getQuestionTypeLabel(q: Question): string {
  const qWithDisplay = q as Question & { display_type?: string }
  if (qWithDisplay.display_type?.trim()) return qWithDisplay.display_type.trim()
  return QUESTION_TYPE_LABELS[q.type ?? ''] ?? ''
}

function QuestionBlock({
  index,
  question,
  value,
  onChange,
  result,
}: {
  index: number
  question: Question
  value: unknown
  onChange: (v: unknown) => void
  result?: SubmitResult
}) {
  const type = question.type ?? ''
  const isCorrect = result?.isCorrect
  const showResult = result !== undefined

  const typeLabel = getQuestionTypeLabel(question)

  return (
    <div className={`rounded-xl border-2 p-4 ${showResult ? (isCorrect ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50') : 'border-amber-100 bg-white'}`}>
      <div className="flex items-center gap-2 mb-2">
        <p className="font-medium text-amber-900">第 {index + 1} 題</p>
        {typeLabel && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-100 text-amber-800">
            {typeLabel}
          </span>
        )}
      </div>
      {(type === 'multiple_choice' || type === 'choice') && (
        <>
          <p className="text-amber-800 mb-3">{(question as Question & { question?: string }).question}</p>
          <div className="space-y-2">
            {((question as Question & { options?: string[] }).options ?? []).map((opt, j) => (
              <label key={j} className="flex items-center gap-2 min-h-[44px] cursor-pointer">
                <input
                  type="radio"
                  name={`q-${index}`}
                  checked={value === j}
                  onChange={() => onChange(j)}
                  className="w-5 h-5"
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </>
      )}
      {(type === 'fill_blank' || type === 'fill') && (
        <>
          <p className="text-amber-800 mb-3">{(question as Question & { question?: string }).question}</p>
          <input
            type="text"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full min-h-[44px] py-2 px-3 rounded-lg border-2 border-amber-200"
            placeholder="請輸入答案"
          />
        </>
      )}
      {(type === 'true_false' || type === 'judge') && (
        <>
          <p className="text-amber-800 mb-3">{(question as Question & { question?: string }).question}</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onChange(true)}
              className={`min-h-[44px] px-4 rounded-xl font-medium touch-manipulation ${value === true ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-800'}`}
            >
              對
            </button>
            <button
              type="button"
              onClick={() => onChange(false)}
              className={`min-h-[44px] px-4 rounded-xl font-medium touch-manipulation ${value === false ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-800'}`}
            >
              錯
            </button>
          </div>
        </>
      )}
      {(type === 'reorder' || type === 'order') && (
        <ReorderQuestion question={question as Question & { sentences?: string[]; correct_order?: number[] }} value={value} onChange={onChange} />
      )}
      {(type === 'matching' || type === 'match') && (
        <MatchingQuestion question={question as Question & { left?: string[]; right?: string[] }} value={value} onChange={onChange} />
      )}
      {type === 'short_answer' && (
        <>
          <p className="text-amber-800 mb-3">{(question as Question & { question?: string }).question}</p>
          <textarea
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full min-h-[80px] py-2 px-3 rounded-lg border-2 border-amber-200"
            placeholder="請輸入你的答案"
          />
        </>
      )}
      {!['multiple_choice', 'choice', 'fill_blank', 'fill', 'true_false', 'judge', 'reorder', 'order', 'matching', 'match', 'short_answer'].includes(type) && (question as Question & { question?: string }).question != null && (
        <>
          <p className="text-amber-800 mb-3">{(question as Question & { question?: string }).question}</p>
          <input
            type="text"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full min-h-[44px] py-2 px-3 rounded-lg border-2 border-amber-200"
            placeholder="請輸入答案"
          />
        </>
      )}
      {showResult && (
        <div className="mt-3 text-sm">
          {isCorrect ? (
            <p className="text-green-700 font-medium">答對了！</p>
          ) : (
            <>
              <p className="text-red-700 font-medium">答錯了</p>
              {result.correctAnswer != null && <p className="text-amber-800">正確答案：{result.correctAnswer}</p>}
            </>
          )}
          {result.feedback != null && result.feedback !== '' && <p className="text-amber-800 mt-1">回饋：{result.feedback}</p>}
        </div>
      )}
    </div>
  )
}

function ReorderQuestion({
  question,
  value,
  onChange,
}: {
  question: { sentences?: string[]; correct_order?: number[] }
  value: unknown
  onChange: (v: unknown) => void
}) {
  const sentences = question.sentences ?? []
  const currentOrder = (Array.isArray(value) ? value : []) as number[]
  const order = currentOrder.length === sentences.length ? currentOrder : sentences.map((_, i) => i)

  function move(from: number, delta: number) {
    const to = from + delta
    if (to < 0 || to >= order.length) return
    const next = order.slice()
    const [removed] = next.splice(from, 1)
    next.splice(to, 0, removed)
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <p className="text-amber-800 mb-2">請依正確順序排列（點箭頭調整）：</p>
      {order.map((sentenceIdx, displayPos) => (
        <div key={displayPos} className="flex items-center gap-2 flex-wrap">
          <span className="text-amber-600 text-sm w-8">第{displayPos + 1}句</span>
          <span className="flex-1 min-w-0 py-2 px-3 rounded-lg bg-amber-50 border border-amber-100">{sentences[sentenceIdx] ?? ''}</span>
          <div className="flex gap-1">
            <button type="button" onClick={() => move(displayPos, -1)} disabled={displayPos === 0} className="p-2 rounded-lg bg-amber-100 disabled:opacity-50">↑</button>
            <button type="button" onClick={() => move(displayPos, 1)} disabled={displayPos === order.length - 1} className="p-2 rounded-lg bg-amber-100 disabled:opacity-50">↓</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function MatchingQuestion({
  question,
  value,
  onChange,
}: {
  question: { question?: string; left?: string[]; right?: string[] }
  value: unknown
  onChange: (v: unknown) => void
}) {
  const left = question.left ?? []
  const right = question.right ?? []
  const pairList = (Array.isArray(value) ? value : []) as number[][]
  const pairs: number[] = left.map((_, i) => pairList.find((p) => p[0] === i)?.[1] ?? 0)

  function setPair(leftIdx: number, rightIdx: number) {
    const next = pairs.slice()
    next[leftIdx] = rightIdx
    onChange(next.map((r, l) => [l, r]))
  }

  return (
    <div className="space-y-3">
      {question.question != null && question.question !== '' && <p className="text-amber-800 mb-2">{question.question}</p>}
      <div className="space-y-2">
        {left.map((label, i) => (
          <div key={i} className="flex items-center gap-2 flex-wrap">
            <span className="w-24 shrink-0 py-2 px-2 rounded-lg bg-amber-50 border border-amber-100">{label}</span>
            <span className="text-amber-600">→</span>
            <select
              value={pairs[i] ?? 0}
              onChange={(e) => setPair(i, Number(e.target.value))}
              className="min-h-[44px] flex-1 min-w-[120px] py-2 px-3 rounded-lg border-2 border-amber-200"
            >
              {right.map((opt, j) => (
                <option key={j} value={j}>{opt}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}
