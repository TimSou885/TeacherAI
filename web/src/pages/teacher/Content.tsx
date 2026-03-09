import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import { useTeacherClass } from '../../contexts/TeacherClassContext'

type ExerciseItem = {
  id: string
  title: string
  category: string
  grade_level: number | null
  created_at: string
}

const CATEGORY_LABELS: Record<string, string> = {
  reading: '閱讀理解',
  grammar: '語文基礎',
  vocabulary: '詞語運用',
  dictation: '默書詞表',
  reorder: '排句成段',
  matching: '配對',
}

export default function Content() {
  const { classId, classes } = useTeacherClass()
  const [exercises, setExercises] = useState<ExerciseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!classId) {
      setExercises([])
      setLoading(classes.length === 0)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    apiFetch(`/api/exercises?class_id=${encodeURIComponent(classId)}`, undefined, { preferTeacher: true })
      .then((res) => {
        if (!res.ok) throw new Error('無法載入練習')
        return res.json()
      })
      .then((data: { exercises?: ExerciseItem[] }) => {
        if (!cancelled) setExercises(data.exercises ?? [])
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '載入失敗')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [classId, classes.length, retryKey])

  if (classes.length === 0) {
    return (
      <div className="rounded-xl bg-amber-100/80 border border-amber-200 p-6 text-center text-amber-800">
        <p className="font-medium">尚無班級</p>
        <p className="mt-2 text-sm">請聯絡學校管理員，將您的帳號設為班級負責老師。</p>
      </div>
    )
  }

  if (loading && exercises.length === 0) {
    return <div className="p-6 text-center text-amber-800">載入中…</div>
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-red-700">
        <p>{error}</p>
        <button
          type="button"
          onClick={() => { setError(''); setRetryKey((k) => k + 1) }}
          className="mt-3 px-4 py-2 rounded-lg border border-red-200 hover:bg-red-100 font-medium"
        >
          重試
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-amber-900">內容管理</h1>
        <Link
          to="/teacher/generate"
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600"
        >
          AI 出題
        </Link>
      </div>

      <p className="text-sm text-amber-700">默書詞表、測驗題、跨班共享（預留）</p>

      <ul className="bg-white rounded-xl border border-amber-100 divide-y divide-amber-100 overflow-hidden">
        {exercises.map((ex) => (
          <li key={ex.id} className="px-4 py-3 flex items-center justify-between">
            <div>
              <span className="font-medium text-amber-900">{ex.title}</span>
              <span className="ml-2 text-sm text-amber-600">
                {CATEGORY_LABELS[ex.category] ?? ex.category}
              </span>
            </div>
            <span className="text-xs text-amber-500">
              {ex.created_at ? new Date(ex.created_at).toLocaleDateString('zh-TW') : ''}
            </span>
          </li>
        ))}
      </ul>

      {exercises.length === 0 && (
        <div className="text-center py-12">
          <p className="text-amber-700 mb-4">此班級尚無練習</p>
          <Link
            to="/teacher/generate"
            className="inline-block min-h-[44px] px-6 py-3 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600"
          >
            立即建立（AI 出題）
          </Link>
        </div>
      )}
    </div>
  )
}
