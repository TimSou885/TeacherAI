import { useState, useEffect } from 'react'
import { apiFetch } from '../../lib/api'
import { useTeacherClass } from '../../contexts/TeacherClassContext'

const CATEGORY_LABELS: Record<string, string> = {
  reading: '閱讀理解',
  grammar: '語文基礎',
  vocabulary: '詞語運用',
  dictation: '默書',
  reorder: '排句成段',
}

type TopError = { text: string; count: number; category: string }

export default function ErrorReview() {
  const { classId, classes } = useTeacherClass()
  const [topErrors, setTopErrors] = useState<TopError[]>([])
  const [loading, setLoading] = useState(false)
  const [projectingIndex, setProjectingIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!classId) {
      setTopErrors([])
      setProjectingIndex(null)
      return
    }
    setLoading(true)
    apiFetch(`/api/teacher/class-weakness?class_id=${encodeURIComponent(classId)}`, undefined, { preferTeacher: true })
      .then((res) => res.json())
      .then((data: { topErrors?: TopError[] }) => {
        setTopErrors(data.topErrors ?? [])
        setProjectingIndex(null)
      })
      .catch(() => setTopErrors([]))
      .finally(() => setLoading(false))
  }, [classId])

  if (classes.length === 0) {
    return (
      <div className="rounded-xl bg-amber-100/80 border border-amber-200 p-6 text-center text-amber-800">
        尚無班級。
      </div>
    )
  }

  if (projectingIndex !== null && topErrors[projectingIndex]) {
    const e = topErrors[projectingIndex]
    return (
      <div className="fixed inset-0 bg-amber-50 flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-3xl w-full">
          <p className="text-amber-600 text-lg mb-2">錯題討論 · {projectingIndex + 1} / {topErrors.length}</p>
          <p className="text-2xl md:text-3xl font-medium text-amber-900 break-words mb-4">{e.text}</p>
          <p className="text-xl text-amber-700">
            {CATEGORY_LABELS[e.category] ?? e.category} · 全班錯了 {e.count} 次
          </p>
        </div>
        <div className="fixed bottom-8 left-0 right-0 flex justify-center gap-4">
          <button
            type="button"
            onClick={() => setProjectingIndex((i) => (i === null ? null : Math.max(0, i - 1)))}
            className="px-6 py-3 rounded-xl bg-amber-200 text-amber-900 font-medium"
          >
            上一則
          </button>
          <button
            type="button"
            onClick={() =>
              setProjectingIndex((i) => {
                if (i === null) return null
                if (i + 1 >= topErrors.length) return null
                return i + 1
              })
            }
            className="px-6 py-3 rounded-xl bg-amber-500 text-white font-medium"
          >
            {projectingIndex + 1 >= topErrors.length ? '結束投影' : '下一則'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-amber-900">錯題討論投影</h1>
      <p className="text-sm text-amber-700">將班級高頻錯題投影，供課堂討論與講解。</p>
      {loading ? (
        <p className="text-amber-700">載入中…</p>
      ) : topErrors.length === 0 ? (
        <p className="text-amber-700">目前無高頻錯題數據，或班級尚無練習記錄。</p>
      ) : (
        <ul className="space-y-2">
          {topErrors.map((e, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => setProjectingIndex(i)}
                className="w-full text-left px-4 py-3 rounded-lg border border-amber-200 bg-white hover:bg-amber-50 text-amber-900"
              >
                <span className="font-medium">{e.text.slice(0, 60)}{e.text.length > 60 ? '…' : ''}</span>
                <span className="text-amber-600 text-sm ml-2">
                  {CATEGORY_LABELS[e.category] ?? e.category} · {e.count} 次
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
