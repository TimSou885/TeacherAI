import { useState, useEffect } from 'react'
import { apiFetch } from '../../lib/api'

type AdminStats = {
  todayActiveCount: number
  studentCount: number
  conversationCount: number
  pendingFlagsCount: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/api/admin/stats', undefined, { preferTeacher: true })
      .then((res) => {
        if (!res.ok) throw new Error('無法載入')
        return res.json()
      })
      .then((data: AdminStats) => setStats(data))
      .catch((e) => setError(e instanceof Error ? e.message : '載入失敗'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6 text-slate-600">載入中…</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">系統總覽</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-sm text-slate-600">今日活躍學生</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.todayActiveCount ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-sm text-slate-600">總學生數</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.studentCount ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-sm text-slate-600">對話總數</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.conversationCount ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-sm text-slate-600">待審標記</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.pendingFlagsCount ?? 0}</p>
        </div>
      </div>
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-medium text-slate-900 mb-2">AI 每日摘要</h2>
        <p className="text-sm text-slate-600">（預留：可接 Cron 掃描後的每日摘要 API）</p>
      </section>
    </div>
  )
}
