import { useState, useEffect } from 'react'
import { apiFetch } from '../../lib/api'
import { useTeacherClass } from '../../contexts/TeacherClassContext'

type StudentItem = {
  id: string
  name: string
  display_name: string | null
  grade_level: number | null
}

export default function Students() {
  const { classId, classes } = useTeacherClass()
  const [students, setStudents] = useState<StudentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (!classId) {
      setStudents([])
      setLoading(classes.length === 0)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    apiFetch(`/api/teacher/students?class_id=${encodeURIComponent(classId)}`, undefined, { preferTeacher: true })
      .then((res) => {
        if (!res.ok) throw new Error('無法載入學生')
        return res.json()
      })
      .then((data: { students?: StudentItem[] }) => {
        if (!cancelled) setStudents(data.students ?? [])
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '載入失敗')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [classId, classes.length])

  if (classes.length === 0) {
    return (
      <div className="rounded-xl bg-amber-100/80 border border-amber-200 p-6 text-center text-amber-800">
        <p>尚無班級。</p>
      </div>
    )
  }

  if (loading && students.length === 0) {
    return <div className="p-6 text-center text-amber-800">載入中…</div>
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-red-700">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-amber-900">學生列表</h1>

      <ul className="bg-white rounded-xl border border-amber-100 divide-y divide-amber-100 overflow-hidden">
        {students.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => setSelectedId(selectedId === s.id ? null : s.id)}
              className="w-full text-left px-4 py-3 hover:bg-amber-50 flex items-center justify-between"
            >
              <span className="font-medium text-amber-900">
                {s.display_name || s.name}
              </span>
              {s.grade_level != null && (
                <span className="text-sm text-amber-600">小{s.grade_level}</span>
              )}
            </button>
            {selectedId === s.id && (
              <div className="px-4 pb-4 pt-0 bg-amber-50/50 border-t border-amber-100">
                <p className="text-sm text-amber-800">
                  學生詳情（預留：成績趨勢、錯題狀態可接 API）
                </p>
                <p className="text-xs text-amber-600 mt-1">ID: {s.id}</p>
              </div>
            )}
          </li>
        ))}
      </ul>

      {students.length === 0 && (
        <p className="text-amber-700 text-center py-8">此班級尚無學生</p>
      )}
    </div>
  )
}
