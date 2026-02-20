import { useState, useEffect } from 'react'
import { apiFetch } from '../../lib/api'
import { useTeacherClass } from '../../contexts/TeacherClassContext'

type ExerciseItem = { id: string; title: string; category: string; grade_level: number | null; created_at: string }
type Question = { type?: string; question?: string; word?: string; options?: string[]; answer?: string }
type ExerciseDetail = {
  id: string
  title: string
  category: string
  questions: unknown
  grade_level: number | null
}

export default function Quiz() {
  const { classId, classes } = useTeacherClass()
  const [exercises, setExercises] = useState<ExerciseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ExerciseDetail | null>(null)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!classId) {
      setExercises([])
      setLoading(classes.length === 0)
      return
    }
    setLoading(true)
    apiFetch(`/api/exercises?class_id=${encodeURIComponent(classId)}`, undefined, { preferTeacher: true })
      .then((res) => (res.ok ? res.json() : { exercises: [] }))
      .then((data: { exercises?: ExerciseItem[] }) => setExercises(data.exercises ?? []))
      .finally(() => setLoading(false))
  }, [classId, classes.length])

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      setIndex(0)
      return
    }
    apiFetch(`/api/exercises/${selectedId}`, undefined, { preferTeacher: true })
      .then((res) => (res.ok ? res.json() : null))
      .then(setDetail)
    setIndex(0)
  }, [selectedId])

  const questions = (detail?.questions as Question[] | undefined) ?? []
  const current = questions[index]
  const isProjecting = selectedId && detail && questions.length > 0

  if (classes.length === 0) {
    return (
      <div className="rounded-xl bg-amber-100/80 border border-amber-200 p-6 text-center text-amber-800">
        尚無班級。
      </div>
    )
  }

  if (isProjecting) {
    const text = current?.question ?? current?.word ?? '（無題目）'
    return (
      <div className="fixed inset-0 bg-amber-50 flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-3xl w-full">
          <p className="text-amber-700 text-lg mb-4">{detail.title} · 第 {index + 1} / {questions.length} 題</p>
          <p className="text-3xl md:text-4xl font-medium text-amber-900 break-words">{text}</p>
          {current?.options?.length ? (
            <ul className="mt-8 space-y-2 text-left inline-block">
              {current.options.map((opt, i) => (
                <li key={i} className="text-xl md:text-2xl text-amber-800">{(i + 1)}. {opt}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="fixed bottom-8 left-0 right-0 flex justify-center gap-4">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            className="px-6 py-3 rounded-xl bg-amber-200 text-amber-900 font-medium"
          >
            上一題
          </button>
          <button
            type="button"
            onClick={() => {
              if (index + 1 >= questions.length) setSelectedId(null)
              else setIndex(index + 1)
            }}
            className="px-6 py-3 rounded-xl bg-amber-500 text-white font-medium"
          >
            {index + 1 >= questions.length ? '結束投影' : '下一題'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-amber-900">隨堂測驗投影</h1>
      <p className="text-sm text-amber-700">選擇一則練習後，以大字投影題目供課堂使用。</p>
      {loading ? (
        <p className="text-amber-700">載入中…</p>
      ) : exercises.length === 0 ? (
        <p className="text-amber-700">本班尚無練習，請先在「內容」或「AI 出題」建立練習。</p>
      ) : (
        <ul className="space-y-2">
          {exercises.map((ex) => (
            <li key={ex.id}>
              <button
                type="button"
                onClick={() => setSelectedId(ex.id)}
                className="w-full text-left px-4 py-3 rounded-lg border border-amber-200 bg-white hover:bg-amber-50 text-amber-900"
              >
                {ex.title}
                <span className="text-amber-600 text-sm ml-2">{ex.category}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
