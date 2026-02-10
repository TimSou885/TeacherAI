import { useState, useEffect } from 'react'
import { apiFetch, getStudentSession } from '../../lib/api'
import type { ErrorBookItem } from './ErrorBook'

function normalizeText(s: string): string {
  return s.trim().replace(/\s+/g, '').replace(/［/g, '[').replace(/］/g, ']').replace(/（/g, '(').replace(/）/g, ')')
}

function gradeQuestion(q: Record<string, unknown>, studentValue: unknown): { isCorrect: boolean; correctAnswer?: string } {
  const type = ((q.type as string) ?? '').toLowerCase()
  if (type === 'multiple_choice' || type === 'choice') {
    const correctIdx = Number(q.correct)
    const opts = q.options as string[] | undefined
    const ans = typeof studentValue === 'number' ? studentValue : Number(studentValue)
    const isCorrect = !Number.isNaN(ans) && ans === correctIdx
    return { isCorrect, correctAnswer: opts?.[correctIdx] }
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
    const correctOrder = ((q.correct_order as number[]) ?? []).slice()
    const ans = Array.isArray(studentValue) ? studentValue : []
    const isCorrect = ans.length === correctOrder.length && ans.every((v: number, i: number) => Number(v) === correctOrder[i])
    return { isCorrect, correctAnswer: correctOrder.join(', ') }
  }
  if (type === 'matching' || type === 'match') {
    const pairs = (q.correct_pairs ?? []) as number[][]
    const ans = Array.isArray(studentValue) ? studentValue : []
    const normalized = pairs.map(([a, b]: number[]) => `${a},${b}`).sort().join(';')
    const studentNorm = ans.map((p: number[]) => `${p[0]},${p[1]}`).sort().join(';')
    return { isCorrect: normalized === studentNorm, correctAnswer: '配對正確' }
  }
  return { isCorrect: false }
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: Record<string, unknown>
  value: unknown
  onChange: (v: unknown) => void
}) {
  const type = ((question.type as string) ?? '').toLowerCase()
  if (type === 'multiple_choice' || type === 'choice') {
    const opts = (question.options as string[]) ?? []
    return (
      <div className="space-y-2">
        {opts.map((opt, j) => (
          <label key={j} className="flex items-center gap-2 min-h-[44px] cursor-pointer">
            <input
              type="radio"
              checked={value === j}
              onChange={() => onChange(j)}
              className="w-5 h-5"
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    )
  }
  if (type === 'fill_blank' || type === 'fill') {
    return (
      <input
        type="text"
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[44px] py-2 px-3 rounded-lg border-2 border-amber-200"
        placeholder="請輸入答案"
      />
    )
  }
  if (type === 'true_false' || type === 'judge') {
    return (
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
    )
  }
  if (type === 'reorder' || type === 'order') {
    const sentences = (question.sentences as string[]) ?? []
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
  if (type === 'matching' || type === 'match') {
    const left = (question.left as string[]) ?? []
    const right = (question.right as string[]) ?? []
    const pairList = (Array.isArray(value) ? value : []) as number[][]
    const pairs: number[] = left.map((_, i) => pairList.find((p) => p[0] === i)?.[1] ?? 0)
    function setPair(leftIdx: number, rightIdx: number) {
      const next = pairs.slice()
      next[leftIdx] = rightIdx
      onChange(next.map((r, l) => [l, r]))
    }
    return (
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
    )
  }
  return (
    <input
      type="text"
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full min-h-[44px] py-2 px-3 rounded-lg border-2 border-amber-200"
      placeholder="請輸入答案"
    />
  )
}

export default function ErrorReviewSession({
  items,
  onFinish,
}: {
  items: ErrorBookItem[]
  onFinish: () => void
}) {
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState<unknown>(null)
  const [result, setResult] = useState<{ isCorrect: boolean; correctAnswer?: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [stats, setStats] = useState({ correct: 0, total: 0 })

  const item = items[index]
  const questionData = item?.error_content?.question_data as Record<string, unknown> | undefined
  const question = questionData ?? {}

  // 切換題目時，reorder 需預設為正確順序、matching 需預設 pairs
  useEffect(() => {
    const t = ((question.type as string) ?? '').toLowerCase()
    if (t === 'reorder' || t === 'order') {
      const sentences = (question.sentences as string[]) ?? []
      setAnswer(sentences.map((_, i) => i))
    } else if (t === 'matching' || t === 'match') {
      const left = (question.left as string[]) ?? []
      setAnswer(left.map((_, i) => [i, 0]))
    } else {
      setAnswer(null)
    }
  }, [index, item?.id])

  const type = ((question.type as string) ?? '').toLowerCase()
  const isShortAnswer = type === 'short_answer'

  const handleNext = () => {
    setIndex((i) => i + 1)
    setResult(null)
  }

  const handleSubmit = async () => {
    if (result !== null) {
      if (index + 1 >= items.length) {
        onFinish()
      } else {
        handleNext()
      }
      return
    }
    if (isShortAnswer) {
      handleNext()
      return
    }
    const session = getStudentSession()
    if (!session?.token) {
      setError('請先登入')
      return
    }
    const graded = gradeQuestion(question, answer)
    setSubmitting(true)
    setError('')
    try {
      const res = await apiFetch(`/api/error-book/${item.id}/practice`, {
        method: 'POST',
        body: JSON.stringify({ isCorrect: graded.isCorrect }),
      }, { token: session.token })
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(d.message ?? '記錄失敗')
      }
      setResult(graded)
      setStats((s) => ({ correct: s.correct + (graded.isCorrect ? 1 : 0), total: s.total + 1 }))
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交失敗')
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = answer !== null && (Array.isArray(answer) ? answer.length > 0 : String(answer ?? '').trim() !== '')
  const progress = `${index + 1} / ${items.length}`

  if (!item) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-6 text-center">
          <p className="font-medium text-amber-900">複習完成！</p>
          <p className="text-amber-800 mt-2">本次答對 {stats.correct} / {stats.total} 題</p>
        </div>
        <button type="button" onClick={onFinish} className="mt-4 text-amber-700 underline">返回錯題本</button>
      </div>
    )
  }

  const questionText = (question.question as string) ?? (question.word as string) ?? `第 ${index + 1} 題`
  const isCorrect = result?.isCorrect
  const showResult = result !== undefined && result !== null

  if (isShortAnswer) {
    return (
      <div className="flex-1 overflow-auto p-6 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={index === 0 ? onFinish : handleNext} className="text-amber-700 text-sm underline">
            {index === 0 ? '← 返回' : '← 上一題'}
          </button>
          <span className="text-amber-800 text-sm">錯題複習 {progress}</span>
        </div>
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50/50 p-4 mb-6">
          <p className="font-medium text-amber-900 mb-2">第 {index + 1} 題（簡答題）</p>
          <p className="text-amber-800 mb-3">{questionText}</p>
          <p className="text-amber-700 text-sm">此題為簡答題，無法在此自動評分。請至原練習中作答。</p>
        </div>
        <button
          type="button"
          onClick={index + 1 >= items.length ? onFinish : handleNext}
          className="min-h-[44px] px-6 py-3 rounded-xl bg-amber-500 text-white font-medium touch-manipulation"
        >
          {index + 1 >= items.length ? '完成' : '下一題'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto p-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={index === 0 ? onFinish : handleNext} className="text-amber-700 text-sm underline">
          {index === 0 ? '← 返回' : '← 上一題'}
        </button>
        <span className="text-amber-800 text-sm">錯題複習 {progress}</span>
      </div>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className={`rounded-xl border-2 p-4 mb-6 ${showResult ? (isCorrect ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50') : 'border-amber-100 bg-white'}`}>
        <p className="font-medium text-amber-900 mb-2">第 {index + 1} 題</p>
        <p className="text-amber-800 mb-3">{questionText}</p>
        <QuestionInput question={question} value={answer} onChange={setAnswer} />

        {showResult && (
          <div className="mt-3 text-sm">
            {isCorrect ? (
              <p className="text-green-700 font-medium">答對了！</p>
            ) : (
              <>
                <p className="text-red-700 font-medium">答錯了</p>
                {result.correctAnswer != null && <p className="text-amber-800">正確答案：{result.correctAnswer}</p>}
                <p className="text-amber-800 mt-1">再答對 3 次即可移出錯題本</p>
              </>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={(!canSubmit && !showResult) || submitting}
        className="min-h-[44px] px-6 py-3 rounded-xl bg-amber-500 text-white font-medium disabled:opacity-50 touch-manipulation"
      >
        {submitting ? '提交中…' : showResult ? (index + 1 >= items.length ? '完成' : '下一題') : '提交答案'}
      </button>
    </div>
  )
}
