import { useState, useEffect } from 'react'
import { apiFetch, getStudentSession, clearStudentSession, isStudentToken } from '../../lib/api'

type ErrorBookItem = {
  id: string
  exercise_id: string
  category: string
  question_index: number
  error_content: Record<string, unknown>
  correct_count: number
  last_practiced_at: string | null
  created_at: string
}

const CATEGORY_LABELS: Record<string, string> = {
  reading: '閱讀理解',
  grammar: '語文基礎',
  vocabulary: '詞語運用',
  reorder: '排句成段',
  dictation: '默書',
  quiz: '測驗',
}

export default function ErrorBook({
  onStartReview,
}: {
  onStartReview: (items: ErrorBookItem[]) => void
}) {
  const [items, setItems] = useState<ErrorBookItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const session = getStudentSession()
    if (!session?.token || !isStudentToken(session.token)) {
      setError('請先登入學生帳號')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    apiFetch('/api/error-book?limit=20', undefined, { token: session.token })
      .then((res) => {
        if (!res.ok) throw new Error('無法載入錯題')
        return res.json()
      })
      .then((data: { items?: ErrorBookItem[] }) => setItems(data.items ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : '載入失敗'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex-1 overflow-auto p-6 text-amber-700">載入中…</div>
  if (error) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <p className="text-red-600 mb-4">{error}</p>
      </div>
    )
  }

  const reviewItems = items.slice(0, 10)

  return (
    <div className="flex-1 overflow-auto p-6">
      <h2 className="text-lg font-semibold text-amber-900 mb-2">錯題本</h2>
      <p className="text-amber-800/80 text-sm mb-4">
        答錯的題目會自動加入這裡。複習時連續答對 3 次，該題會從錯題本移出。
      </p>
      {items.length === 0 ? (
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-6 text-center text-amber-800">
          <p className="font-medium">目前沒有待複習的錯題</p>
          <p className="text-sm mt-2">多做練習，答錯的題目會自動出現在這裡</p>
        </div>
      ) : (
        <>
          <p className="text-amber-800 text-sm mb-3">
            待複習：{items.length} 題
            {reviewItems.length < items.length && `（每次最多 ${reviewItems.length} 題）`}
          </p>
          <ul className="space-y-2 mb-6">
            {reviewItems.map((item) => {
              const ec = item.error_content
              const summary =
                (ec.question as string) ??
                (ec.word as string) ??
                `第 ${item.question_index + 1} 題`
              const catLabel = CATEGORY_LABELS[item.category] ?? item.category
              return (
                <li
                  key={item.id}
                  className="py-2 px-4 rounded-lg bg-white border border-amber-100 text-amber-900 text-sm"
                >
                  <span className="inline-block mr-2 px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800">
                    {catLabel}
                  </span>
                  {String(summary).slice(0, 50)}
                  {String(summary).length > 50 ? '…' : ''}
                </li>
              )
            })}
          </ul>
          <button
            type="button"
            onClick={() => onStartReview(reviewItems)}
            className="min-h-[44px] w-full px-6 py-3 rounded-xl bg-amber-500 text-white font-medium touch-manipulation hover:bg-amber-600"
          >
            開始複習（{reviewItems.length} 題）
          </button>
        </>
      )}
    </div>
  )
}
