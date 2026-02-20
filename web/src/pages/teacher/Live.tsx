import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { useTeacherClass } from '../../contexts/TeacherClassContext'

type ExerciseItem = { id: string; title: string; category: string; grade_level: number | null; created_at: string }

export default function Live() {
  const { classId, classes } = useTeacherClass()
  const [exercises, setExercises] = useState<ExerciseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [session, setSession] = useState<{ id: string; code: string; participant_count: number; status: string } | null>(null)
  const [participantCount, setParticipantCount] = useState(0)
  const [selectedExerciseId, setSelectedExerciseId] = useState('')
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

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

  // 建立場次後立即取一次參與人數
  useEffect(() => {
    if (!session?.id) return
    apiFetch(`/api/live/session/${session.id}`, undefined, { preferTeacher: true })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { participant_count?: number } | null) => {
        if (data?.participant_count != null) setParticipantCount(data.participant_count)
      })
  }, [session?.id])

  // Realtime：訂閱場次狀態與參與人數
  useEffect(() => {
    if (!session?.id) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      return
    }
    const ch = supabase
      .channel(`live:${session.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_sessions', filter: `id=eq.${session.id}` },
        (payload) => {
          const row = (payload.new ?? payload.old) as { status?: string }
          if (row?.status) setSession((s) => (s ? { ...s, status: row.status! } : null))
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_participants', filter: `session_id=eq.${session.id}` },
        () => {
          setParticipantCount((c) => c + 1)
        }
      )
    ch.subscribe()
    channelRef.current = ch
    return () => {
      supabase.removeChannel(ch)
      channelRef.current = null
    }
  }, [session?.id])

  // 輪詢參與人數（Realtime 未啟用時備援）
  useEffect(() => {
    if (!session?.id) return
    const sid = session.id
    const t = setInterval(() => {
      apiFetch(`/api/live/session/${sid}`, undefined, { preferTeacher: true })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { participant_count?: number; status?: string } | null) => {
          if (data) {
            setParticipantCount(data.participant_count ?? 0)
            setSession((s) => (s && data.status ? { ...s, status: data.status } : s))
          }
        })
    }, 3000)
    return () => clearInterval(t)
  }, [session?.id])

  const handleCreate = async () => {
    if (!classId || !selectedExerciseId) return
    setCreating(true)
    try {
      const res = await apiFetch('/api/live/create', {
        method: 'POST',
        body: JSON.stringify({ class_id: classId, exercise_id: selectedExerciseId }),
      }, { preferTeacher: true })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { message?: string }
        throw new Error(data.message ?? '建立失敗')
      }
      const data = (await res.json()) as { session_id: string; code: string }
      setSession({
        id: data.session_id,
        code: data.code,
        participant_count: 0,
        status: 'waiting',
      })
      setParticipantCount(0)
    } catch (e) {
      alert(e instanceof Error ? e.message : '建立失敗')
    } finally {
      setCreating(false)
    }
  }

  const handleStart = async () => {
    if (!session?.id) return
    const res = await apiFetch(`/api/live/session/${session.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'started' }),
    }, { preferTeacher: true })
    if (res.ok) setSession((s) => (s ? { ...s, status: 'started' } : null))
  }

  const handleEnd = async () => {
    if (!session?.id) return
    const res = await apiFetch(`/api/live/session/${session.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'ended' }),
    }, { preferTeacher: true })
    if (res.ok) {
      setSession(null)
      setParticipantCount(0)
    }
  }

  // 同步顯示參與人數（Realtime 更新或輪詢）
  const displayCount = session ? participantCount ?? session.participant_count ?? 0 : 0

  if (classes.length === 0) {
    return (
      <div className="rounded-xl bg-amber-100/80 border border-amber-200 p-6 text-center text-amber-800">
        尚無班級。
      </div>
    )
  }

  if (session) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-amber-900">即時課堂測驗</h1>
        <div className="bg-white rounded-xl border-2 border-amber-200 p-6 text-center">
          <p className="text-sm text-amber-700 mb-2">請學生輸入以下代碼加入</p>
          <p className="text-4xl font-bold tracking-widest text-amber-900 mb-4">{session.code}</p>
          <p className="text-amber-700">
            已加入 <strong className="text-amber-900">{displayCount}</strong> 人
          </p>
          <p className="text-sm text-amber-600 mt-1">狀態：{session.status === 'waiting' ? '等待中' : session.status === 'started' ? '已開始' : '已結束'}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {session.status === 'waiting' && (
            <button
              type="button"
              onClick={handleStart}
              className="min-h-[44px] px-6 py-3 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600"
            >
              開始測驗
            </button>
          )}
          <button
            type="button"
            onClick={handleEnd}
            className="min-h-[44px] px-6 py-3 rounded-xl bg-amber-100 text-amber-900 font-medium hover:bg-amber-200"
          >
            {session.status === 'ended' ? '關閉' : '結束測驗'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-amber-900">即時課堂測驗</h1>
      <p className="text-sm text-amber-700">選擇一則練習後建立場次，學生輸入代碼加入，您可即時看到參與人數並開始測驗。</p>
      {loading ? (
        <p className="text-amber-700">載入中…</p>
      ) : exercises.length === 0 ? (
        <p className="text-amber-700">本班尚無練習，請先在「內容」或「AI 出題」建立練習。</p>
      ) : (
        <>
          <label className="block text-sm font-medium text-amber-800">選擇練習</label>
          <select
            value={selectedExerciseId}
            onChange={(e) => setSelectedExerciseId(e.target.value)}
            className="w-full max-w-md min-h-[44px] px-4 rounded-lg border-2 border-amber-200 bg-white text-amber-900"
          >
            <option value="">— 請選擇 —</option>
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>{ex.title}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selectedExerciseId || creating}
            onClick={handleCreate}
            className="min-h-[44px] px-6 py-3 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-50"
          >
            {creating ? '建立中…' : '建立即時測驗'}
          </button>
        </>
      )}
    </div>
  )
}
