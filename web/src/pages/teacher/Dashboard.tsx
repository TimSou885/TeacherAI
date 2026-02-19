import { useState, useEffect } from 'react'
import { apiFetch } from '../../lib/api'
import { useTeacherClass } from '../../contexts/TeacherClassContext'

/** 從 JWT 解出 sub（使用者 ID），僅用於顯示，不驗證簽章 */
function getUserIdFromJwt(token: string): string | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as { sub?: string }
    return payload.sub ?? null
  } catch {
    return null
  }
}

function UserIdFetcher({ onUserId }: { onUserId: (id: string) => void }) {
  const [id, setId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    import('../../lib/supabase').then(({ supabase }) => supabase.auth.getSession())
      .then(({ data }) => data?.session?.access_token)
      .then((token) => {
        const uid = token ? getUserIdFromJwt(token) : null
        if (uid) {
          setId(uid)
          onUserId(uid)
        }
      })
      .finally(() => setLoading(false))
  }, [onUserId])
  if (loading) return <p className="text-sm text-amber-700">正在取得您的使用者 ID…</p>
  if (!id) return <p className="text-sm text-amber-700">無法取得使用者 ID（請確認已登入老師帳號並重新整理後再試）。</p>
  return (
    <div className="mt-4 p-4 bg-white rounded-lg border border-red-200">
      <p className="text-sm font-medium text-amber-900 mb-2">請在 Supabase 將此班級的 teacher_id 設為以下 ID：</p>
      <code
        className="block p-3 bg-amber-50 rounded border border-amber-200 text-amber-900 text-sm break-all select-all"
        title="點選後複製"
      >
        {id}
      </code>
    </div>
  )
}

type DashboardStats = {
  studentCount: number
  exerciseCount: number
  todayActiveCount: number
  errorBookUnresolvedCount: number
}

export default function Dashboard() {
  const { classId, classes } = useTeacherClass()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [errorUserId, setErrorUserId] = useState<string | null>(null)
  const [fetchedUserId, setFetchedUserId] = useState<string | null>(null)
  const [checkClassDebug, setCheckClassDebug] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    if (!classId) {
      setStats(null)
      setLoading(classes.length === 0)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    setErrorUserId(null)
    setFetchedUserId(null)
    setCheckClassDebug(null)

    async function loadDashboard(retryAfterClaim = false) {
      const res = await apiFetch(`/api/teacher/dashboard?class_id=${encodeURIComponent(classId)}`)
      const data = await res.json().catch(() => ({})) as { message?: string; code?: string }
      if (res.ok) {
        if (!cancelled) setStats(data as DashboardStats)
        return
      }
      if (res.status === 404 && data.code === 'class_not_owned' && !retryAfterClaim) {
        const yourIdFrom404 = (data as { your_user_id?: string }).your_user_id
        setErrorUserId(yourIdFrom404 ?? null)
        const claimRes = await apiFetch('/api/teacher/claim-class', {
          method: 'POST',
          body: JSON.stringify({ class_id: classId }),
        })
        const claimBody = await claimRes.json().catch(() => ({})) as { message?: string; code?: string; your_user_id?: string }
        if (claimRes.ok && !cancelled) {
          await loadDashboard(true)
          return
        }
        if (claimRes.status === 403 && !cancelled) {
          setError(claimBody.message || '此班級已由其他老師負責，無法認領。')
          setErrorUserId(claimBody.your_user_id ?? yourIdFrom404 ?? null)
        }
        else if (!cancelled) {
          setError(data.message || '無法載入儀表板')
          setErrorUserId(null)
          setFetchedUserId(null)
        }
        return
      }
      if (!cancelled) {
        setError(data.message || '無法載入儀表板')
        setErrorUserId(null)
        setFetchedUserId(null)
      }
    }

    loadDashboard()
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '載入失敗')
          setErrorUserId(null)
          setFetchedUserId(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [classId, classes.length])

  if (classes.length === 0) {
    return (
      <div className="rounded-xl bg-amber-100/80 border border-amber-200 p-6 text-center text-amber-800">
        <p>尚無班級，請先在 Supabase 建立班級並設定 teacher_id。</p>
      </div>
    )
  }

  if (loading && !stats) {
    return <div className="p-6 text-center text-amber-800">載入中…</div>
  }

  if (error) {
    const showUserIdBlock = errorUserId ?? fetchedUserId
    const needFetchUserId =
      !showUserIdBlock &&
      (error.includes('teacher_id') || error.includes('使用者 ID') || error.includes('已由其他老師負責'))
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-red-700 space-y-4">
        <p>{error}</p>
        {showUserIdBlock ? (
          <div className="mt-4 p-4 bg-white rounded-lg border border-red-200">
            <p className="text-sm font-medium text-amber-900 mb-2">請在 Supabase 將此班級的 teacher_id 設為以下 ID：</p>
            <code
              className="block p-3 bg-amber-50 rounded border border-amber-200 text-amber-900 text-sm break-all select-all"
              title="點選後複製"
            >
              {showUserIdBlock}
            </code>
          </div>
        ) : needFetchUserId ? (
          <UserIdFetcher onUserId={setFetchedUserId} />
        ) : null}
        {classId && (
          <div className="mt-4 pt-4 border-t border-red-200">
            <button
              type="button"
              onClick={() => {
                setCheckClassDebug(null)
                apiFetch(`/api/teacher/check-class?class_id=${encodeURIComponent(classId)}`)
                  .then((r) => r.json())
                  .then((data) => setCheckClassDebug(data as Record<string, unknown>))
                  .catch(() => setCheckClassDebug({ error: 'request failed' }))
              }}
              className="text-sm text-amber-800 underline"
            >
              除錯：查看 API 看到的 your_user_id / class_teacher_id
            </button>
            {checkClassDebug && (
              <pre className="mt-2 p-3 bg-white rounded border border-amber-200 text-xs overflow-auto max-h-40">
                {JSON.stringify(checkClassDebug, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-amber-900">本週總覽</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-amber-100 p-4 shadow-sm">
          <p className="text-sm text-amber-700">今日活躍</p>
          <p className="text-2xl font-bold text-amber-900 mt-1">{stats?.todayActiveCount ?? 0}</p>
          <p className="text-xs text-amber-600 mt-0.5">人</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-100 p-4 shadow-sm">
          <p className="text-sm text-amber-700">班級人數</p>
          <p className="text-2xl font-bold text-amber-900 mt-1">{stats?.studentCount ?? 0}</p>
          <p className="text-xs text-amber-600 mt-0.5">人</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-100 p-4 shadow-sm">
          <p className="text-sm text-amber-700">練習數</p>
          <p className="text-2xl font-bold text-amber-900 mt-1">{stats?.exerciseCount ?? 0}</p>
          <p className="text-xs text-amber-600 mt-0.5">則</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-100 p-4 shadow-sm">
          <p className="text-sm text-amber-700">待複習錯題</p>
          <p className="text-2xl font-bold text-amber-900 mt-1">{stats?.errorBookUnresolvedCount ?? 0}</p>
          <p className="text-xs text-amber-600 mt-0.5">筆</p>
        </div>
      </div>

      <section className="bg-white rounded-xl border border-amber-100 p-6">
        <h2 className="font-medium text-amber-900 mb-2">AI 對話趨勢摘要</h2>
        <p className="text-sm text-amber-700">（預留：可接對話統計 API）</p>
      </section>
    </div>
  )
}
