import { useEffect, useState } from 'react'
import { Link, Outlet, NavLink } from 'react-router-dom'
import { apiFetch, setCachedTeacherToken } from '../../lib/api'
import { supabase } from '../../lib/supabase'

export default function AdminLayout() {
  const [ready, setReady] = useState(false)
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => {
    supabase.auth.refreshSession().then(() => supabase.auth.getSession()).then(({ data: { session } }) => {
      setCachedTeacherToken(session?.access_token ?? null)
      setReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCachedTeacherToken(session?.access_token ?? null)
    })
    return () => {
      subscription.unsubscribe()
      setCachedTeacherToken(null)
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    apiFetch('/api/admin/stats', undefined, { preferTeacher: true })
      .then((res) => setForbidden(res.status === 403))
      .catch(() => setForbidden(true))
  }, [ready])

  if (!ready) return <div className="p-8 text-center text-slate-600">載入中…</div>
  if (forbidden) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-md text-center">
          <p className="text-slate-800 font-medium">需要管理員權限</p>
          <p className="text-slate-600 text-sm mt-2">您的帳號未在管理員名單中，無法存取此後台。</p>
          <Link to="/" className="inline-block mt-4 text-slate-700 underline text-sm">返回首頁</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="text-slate-600 text-sm underline">首頁</Link>
          <span className="text-slate-900 font-medium">管理員後台</span>
        </div>
        <nav className="max-w-4xl mx-auto mt-3 flex flex-wrap gap-1">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `min-h-[40px] px-4 py-2 rounded-lg text-sm font-medium transition ${isActive ? 'bg-slate-700 text-white' : 'text-slate-700 hover:bg-slate-200'}`
            }
          >
            系統總覽
          </NavLink>
          <NavLink
            to="/admin/cost"
            className={({ isActive }) =>
              `min-h-[40px] px-4 py-2 rounded-lg text-sm font-medium transition ${isActive ? 'bg-slate-700 text-white' : 'text-slate-700 hover:bg-slate-200'}`
            }
          >
            成本監控
          </NavLink>
          <NavLink
            to="/admin/conversations"
            className={({ isActive }) =>
              `min-h-[40px] px-4 py-2 rounded-lg text-sm font-medium transition ${isActive ? 'bg-slate-700 text-white' : 'text-slate-700 hover:bg-slate-200'}`
            }
          >
            對話審核
          </NavLink>
        </nav>
      </header>
      <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  )
}
