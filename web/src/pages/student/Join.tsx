import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { getStudentSession } from '../../lib/api'

export default function Join() {
  const navigate = useNavigate()
  const session = getStudentSession()
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState<{ session_id: string; exercise_id: string; title: string } | null>(null)
  const [status, setStatus] = useState<string>('waiting')
  const [error, setError] = useState('')
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!session) {
      navigate('/student', { replace: true })
      return
    }
  }, [session, navigate])

  // Realtime：訂閱場次狀態，開始後導向練習
  useEffect(() => {
    if (!joined?.session_id) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      return
    }
    const ch = supabase
      .channel(`live-join:${joined.session_id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'live_sessions', filter: `id=eq.${joined.session_id}` },
        (payload) => {
          const row = payload.new as { status?: string }
          if (row?.status) {
            setStatus(row.status)
            if (row.status === 'started') {
              navigate('/student/home/practice', {
                replace: true,
                state: { liveExerciseId: joined.exercise_id, liveTitle: joined.title },
              })
            }
          }
        }
      )
    ch.subscribe()
    channelRef.current = ch
    return () => {
      supabase.removeChannel(ch)
      channelRef.current = null
    }
  }, [joined?.session_id, joined?.exercise_id, joined?.title, navigate])

  // 輪詢場次狀態（Realtime 未啟用時備援）
  useEffect(() => {
    if (!joined?.session_id) return
    const sid = joined.session_id
    const exId = joined.exercise_id
    const title = joined.title
    const t = setInterval(() => {
      apiFetch(`/api/live/session/${sid}`, undefined, { preferStudent: true })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { status?: string } | null) => {
          if (data?.status) {
            setStatus(data.status)
            if (data.status === 'started') {
              navigate('/student/home/practice', {
                replace: true,
                state: { liveExerciseId: exId, liveTitle: title },
              })
            }
          }
        })
    }, 2000)
    return () => clearInterval(t)
  }, [joined?.session_id, joined?.exercise_id, joined?.title, navigate])

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) {
      setError('請輸入課堂代碼')
      return
    }
    setError('')
    setJoining(true)
    try {
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/ce4da3a2-50de-4590-a46a-3e3626a1067e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5fd7ac'},body:JSON.stringify({sessionId:'5fd7ac',location:'Join.tsx:handleJoin',message:'joinAttempt',data:{code:trimmed,hasSession:!!session,studentClassId:session?.student?.classId ?? null},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      const res = await apiFetch('/api/live/join', {
        method: 'POST',
        body: JSON.stringify({ code: trimmed }),
      }, { preferStudent: true })
      const data = (await res.json()) as {
        session_id?: string
        exercise_id?: string
        message?: string
        code?: string
      }
      if (!res.ok) {
        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/ce4da3a2-50de-4590-a46a-3e3626a1067e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5fd7ac'},body:JSON.stringify({sessionId:'5fd7ac',location:'Join.tsx:joinFailed',message:'joinFailed',data:{status:res.status,code:data.code,message:data.message},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        const msg = data.message ?? '加入失敗'
        setError(data.code ? `${msg} [${data.code}]` : msg)
        return
      }
      const exerciseId = data.exercise_id ?? ''
      let title = '即時測驗'
      try {
        const exRes = await apiFetch(`/api/exercises/${exerciseId}`, undefined, { preferStudent: true })
        if (exRes.ok) {
          const ex = (await exRes.json()) as { title?: string }
          if (ex.title) title = ex.title
        }
      } catch {
        // ignore
      }
      setJoined({
        session_id: data.session_id!,
        exercise_id: exerciseId,
        title,
      })
      setStatus('waiting')
    } catch (e) {
      setError(e instanceof Error ? e.message : '加入失敗')
    } finally {
      setJoining(false)
    }
  }

  if (!session) return null

  if (joined) {
    return (
      <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl border border-amber-200 p-6 text-center">
          <p className="text-lg font-medium text-amber-900 mb-2">已加入課堂測驗</p>
          <p className="text-amber-700 mb-1">{joined.title}</p>
          <p className="text-sm text-amber-600">
            {status === 'waiting' ? '等待老師開始…' : status === 'started' ? '正在導向測驗…' : '測驗已結束'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-xl border border-amber-200 p-6">
        <h1 className="text-xl font-semibold text-amber-900 mb-2">加入即時測驗</h1>
        <p className="text-sm text-amber-700 mb-4">請輸入老師提供的 6 碼課堂代碼</p>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
          placeholder="例如 ABC123"
          className="w-full min-h-[48px] px-4 rounded-xl border-2 border-amber-200 text-amber-900 text-center text-xl tracking-widest uppercase"
          maxLength={6}
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          type="button"
          disabled={joining || code.trim().length < 4}
          onClick={handleJoin}
          className="mt-4 w-full min-h-[48px] rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-50"
        >
          {joining ? '加入中…' : '加入'}
        </button>
        <button
          type="button"
          onClick={() => navigate('/student/home')}
          className="mt-3 w-full min-h-[44px] rounded-xl bg-amber-100 text-amber-900 font-medium hover:bg-amber-200"
        >
          返回首頁
        </button>
      </div>
    </div>
  )
}
