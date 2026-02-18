import { useState, useEffect } from 'react'
import { apiFetch } from '../../lib/api'

const QUIZ_CATEGORIES = [
  { id: 'error_review', label: '錯題複習題' },
  { id: 'reading', label: '閱讀理解' },
  { id: 'grammar', label: '語文基礎' },
  { id: 'vocabulary', label: '詞語運用' },
  { id: 'reorder', label: '排句成段' },
] as const

type ExerciseSummary = { id: string; title: string; category: string; created_at: string }

export default function Practice({
  onSelectExercise,
}: {
  onSelectExercise: (exerciseId: string, title: string) => void
}) {
  const [category, setCategory] = useState<string | null>(null)
  const [exercises, setExercises] = useState<ExerciseSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!category) {
      setExercises([])
      return
    }
    setLoading(true)
    setError('')
    apiFetch(`/api/exercises?category=${encodeURIComponent(category)}`, undefined, { preferStudent: true })
      .then((res) => {
        if (!res.ok) throw new Error('無法載入練習')
        return res.json()
      })
      .then((data: { exercises?: ExerciseSummary[] }) => setExercises(data.exercises ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : '載入失敗'))
      .finally(() => setLoading(false))
  }, [category])

  if (!category) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <h2 className="text-lg font-semibold text-amber-900 mb-2">測驗練習</h2>
        <p className="text-amber-800/80 text-sm mb-4">選擇一個範疇，再選擇一份練習。</p>
        <div className="grid gap-3">
          {QUIZ_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className="min-h-[44px] w-full py-3 px-4 rounded-xl bg-white border-2 border-amber-200 text-amber-900 font-medium text-left hover:bg-amber-50 touch-manipulation"
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const currentLabel = QUIZ_CATEGORIES.find((c) => c.id === category)?.label ?? category

  return (
    <div className="flex-1 overflow-auto p-6">
      <button
        type="button"
        onClick={() => { setCategory(null); setError('') }}
        className="text-amber-700 text-sm underline mb-4"
      >
        ← 返回範疇
      </button>
      <h2 className="text-lg font-semibold text-amber-900 mb-2">{currentLabel}</h2>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      {loading ? (
        <p className="text-amber-700">載入中…</p>
      ) : exercises.length === 0 ? (
        <p className="text-amber-700">尚無此範疇的練習，請聯絡老師。</p>
      ) : (
        <ul className="space-y-3">
          {exercises.map((ex) => (
            <li key={ex.id}>
              <button
                type="button"
                onClick={() => onSelectExercise(ex.id, ex.title)}
                className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-white border-2 border-amber-200 text-amber-900 font-medium text-left hover:bg-amber-50 touch-manipulation"
              >
                {ex.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
