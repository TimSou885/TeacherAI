import { useState, useEffect } from 'react'
import { apiFetch, getTeacherToken } from '../../lib/api'
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

const CATEGORY_LABELS: Record<string, string> = {
  reading: '閱讀理解',
  grammar: '語文基礎',
  vocabulary: '詞語運用',
  dictation: '默書',
  reorder: '排句成段',
}

type DashboardStats = {
  studentCount: number
  exerciseCount: number
  todayActiveCount: number
  errorBookUnresolvedCount: number
}

type CategoryStat = { category: string; unresolvedCount: number }
type TopError = { text: string; count: number; category: string }
type WeaknessData = {
  categoryStats: CategoryStat[]
  topErrors: TopError[]
  aiSuggestion: string | null
}

export default function Dashboard() {
  const { classId, classes } = useTeacherClass()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [weakness, setWeakness] = useState<WeaknessData | null>(null)
  const [loading, setLoading] = useState(true)
  const [weaknessLoading, setWeaknessLoading] = useState(false)
  const [error, setError] = useState('')
  const [errorUserId, setErrorUserId] = useState<string | null>(null)
  const [fetchedUserId, setFetchedUserId] = useState<string | null>(null)
  const [checkClassDebug, setCheckClassDebug] = useState<Record<string, unknown> | null>(null)
  const [sessionDiagnostic, setSessionDiagnostic] = useState<{ hasSession: boolean; hasTeacherToken: boolean } | null>(null)

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
    setSessionDiagnostic(null)

    async function loadDashboard(retryAfterClaim = false) {
      const res = await apiFetch(`/api/teacher/dashboard?class_id=${encodeURIComponent(classId)}`, undefined, { preferTeacher: true })
      const data = await res.json().catch(() => ({})) as { message?: string; code?: string }
      if (res.ok) {
        if (!cancelled) setStats(data as DashboardStats)
        return
      }
      if (res.status === 401 && !cancelled) {
        setError('未登入或登入已過期，請重新登入老師帳號後再試。')
        setErrorUserId(null)
        setFetchedUserId(null)
        return
      }
      if (res.status === 404 && data.code === 'class_not_owned' && !retryAfterClaim) {
        const yourIdFrom404 = (data as { your_user_id?: string }).your_user_id
        setErrorUserId(yourIdFrom404 ?? null)
        const claimRes = await apiFetch('/api/teacher/claim-class', {
          method: 'POST',
          body: JSON.stringify({ class_id: classId }),
        }, { preferTeacher: true })
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

  // 班級弱項分析（選定班級後再載入）
  useEffect(() => {
    if (!classId) {
      setWeakness(null)
      return
    }
    let cancelled = false
    setWeaknessLoading(true)
    apiFetch(`/api/teacher/class-weakness?class_id=${encodeURIComponent(classId)}`, undefined, { preferTeacher: true })
      .then((res) => res.json() as Promise<WeaknessData>)
      .then((data) => {
        if (!cancelled) setWeakness(data)
      })
      .catch(() => {
        if (!cancelled) setWeakness(null)
      })
      .finally(() => {
        if (!cancelled) setWeaknessLoading(false)
      })
    return () => { cancelled = true }
  }, [classId])

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
    const isUnauthorized = error.includes('未登入') || error.includes('登入已過期')
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-red-700 space-y-4">
        <p>{error}</p>
        {isUnauthorized && (
          <>
            <p>
              <a href="/teacher/login" className="font-medium text-amber-700 underline hover:text-amber-800">請點此重新登入老師帳號</a>
            </p>
            <p className="text-sm">
              <button
                type="button"
                onClick={async () => {
                  const { supabase } = await import('../../lib/supabase')
                  const { data: { session } } = await supabase.auth.getSession()
                  const token = await getTeacherToken()
                  setSessionDiagnostic({
                    hasSession: !!(session?.access_token),
                    hasTeacherToken: !!token,
                  })
                }}
                className="text-amber-800 underline"
              >
                檢查前端 session / token
              </button>
              {sessionDiagnostic && (
                <span className="ml-2 text-amber-900">
                  Supabase session: {sessionDiagnostic.hasSession ? '有' : '無'}，getTeacherToken: {sessionDiagnostic.hasTeacherToken ? '有' : '無'}
                </span>
              )}
            </p>
          </>
        )}
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
              onClick={async () => {
                setCheckClassDebug(null)
                const teacherToken = await getTeacherToken()
                if (!teacherToken) {
                  setCheckClassDebug({
                    error: 'no_teacher_session',
                    message: '無法取得老師登入狀態，請重新整理頁面或重新登入老師帳號後再試。',
                    your_user_id: null,
                  })
                  return
                }
                const res = await apiFetch(`/api/teacher/check-class?class_id=${encodeURIComponent(classId)}`, undefined, { token: teacherToken })
                const data = await res.json().catch(() => ({})) as Record<string, unknown>
                setCheckClassDebug(data)
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

      {/* 班級弱項分析：六大範疇健康度、高頻錯題 TOP5、AI 教學建議 */}
      <section className="bg-white rounded-xl border border-amber-100 p-6">
        <h2 className="font-medium text-amber-900 mb-4">班級弱項分析</h2>
        {weaknessLoading ? (
          <p className="text-sm text-amber-700">載入中…</p>
        ) : weakness ? (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-medium text-amber-800 mb-2">六大範疇待複習錯題數</h3>
              <ul className="space-y-2">
                {weakness.categoryStats.map(({ category, unresolvedCount }) => {
                  const label = CATEGORY_LABELS[category] ?? category
                  const max = Math.max(1, ...weakness.categoryStats.map((s) => s.unresolvedCount))
                  const width = max ? Math.round((unresolvedCount / max) * 100) : 0
                  return (
                    <li key={category} className="flex items-center gap-3">
                      <span className="w-24 text-sm text-amber-800 shrink-0">{label}</span>
                      <div className="flex-1 h-5 bg-amber-100 rounded overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded transition-all"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-amber-900 w-8">{unresolvedCount}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
            {weakness.topErrors.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-amber-800 mb-2">高頻錯題 TOP 5</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-amber-800">
                  {weakness.topErrors.map((e, i) => (
                    <li key={i}>
                      <span className="font-medium">{e.text.slice(0, 50)}{e.text.length > 50 ? '…' : ''}</span>
                      <span className="text-amber-600 ml-1">
                        （{CATEGORY_LABELS[e.category] ?? e.category}，{e.count} 次）
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {weakness.aiSuggestion && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <h3 className="text-sm font-medium text-amber-800 mb-1">AI 教學建議</h3>
                <p className="text-sm text-amber-900">{weakness.aiSuggestion}</p>
              </div>
            )}
            {!weakness.categoryStats.some((s) => s.unresolvedCount > 0) && !weakness.aiSuggestion && (
              <p className="text-sm text-amber-700">目前無待複習錯題數據，或班級尚無練習記錄。</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-amber-700">無法載入弱項分析。</p>
        )}
      </section>

      <section className="bg-white rounded-xl border border-amber-100 p-6">
        <h2 className="font-medium text-amber-900 mb-2">AI 對話趨勢摘要</h2>
        <p className="text-sm text-amber-700">（預留：可接對話統計 API）</p>
      </section>
    </div>
  )
}
