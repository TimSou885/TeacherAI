import { useEffect, useState } from 'react'
import { Link, Outlet, NavLink } from 'react-router-dom'
import { apiFetch, setCachedTeacherToken } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { TeacherClassProvider, useTeacherClass, type ClassItem } from '../../contexts/TeacherClassContext'

async function fetchClasses(): Promise<ClassItem[]> {
  const res = await apiFetch('/api/classes', undefined, { preferTeacher: true })
  if (!res.ok) return []
  const data = (await res.json()) as { classes?: ClassItem[] }
  return data.classes ?? []
}

function TeacherNav() {
  const { classes, classId, setClassId } = useTeacherClass()

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">
      <header className="bg-white border-b border-amber-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-amber-700 text-sm underline">首頁</Link>
            <span className="text-amber-900 font-medium">教師工作區</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-amber-800">班級：</label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="min-h-[40px] py-1.5 px-3 rounded-lg border-2 border-amber-200 bg-white text-amber-900"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              {classes.length === 0 && <option value="">— 尚無班級 —</option>}
            </select>
          </div>
        </div>
        <nav className="max-w-4xl mx-auto mt-3 flex flex-wrap gap-1">
          <NavLink
            to="/teacher"
            end
            className={({ isActive }) =>
              `min-h-[40px] px-4 py-2 rounded-lg text-sm font-medium transition ${isActive ? 'bg-amber-500 text-white' : 'text-amber-800 hover:bg-amber-100'}`
            }
          >
            儀表板
          </NavLink>
          <NavLink
            to="/teacher/students"
            className={({ isActive }) =>
              `min-h-[40px] px-4 py-2 rounded-lg text-sm font-medium transition ${isActive ? 'bg-amber-500 text-white' : 'text-amber-800 hover:bg-amber-100'}`
            }
          >
            學生
          </NavLink>
          <NavLink
            to="/teacher/content"
            className={({ isActive }) =>
              `min-h-[40px] px-4 py-2 rounded-lg text-sm font-medium transition ${isActive ? 'bg-amber-500 text-white' : 'text-amber-800 hover:bg-amber-100'}`
            }
          >
            內容
          </NavLink>
          <NavLink
            to="/teacher/generate"
            className={({ isActive }) =>
              `min-h-[40px] px-4 py-2 rounded-lg text-sm font-medium transition ${isActive ? 'bg-amber-500 text-white' : 'text-amber-800 hover:bg-amber-100'}`
            }
          >
            AI 出題
          </NavLink>
          <NavLink
            to="/teacher/quiz"
            className={({ isActive }) =>
              `min-h-[40px] px-4 py-2 rounded-lg text-sm font-medium transition ${isActive ? 'bg-amber-500 text-white' : 'text-amber-800 hover:bg-amber-100'}`
            }
          >
            隨堂測驗
          </NavLink>
          <NavLink
            to="/teacher/stroke-teach"
            className={({ isActive }) =>
              `min-h-[40px] px-4 py-2 rounded-lg text-sm font-medium transition ${isActive ? 'bg-amber-500 text-white' : 'text-amber-800 hover:bg-amber-100'}`
            }
          >
            筆順教學
          </NavLink>
          <NavLink
            to="/teacher/error-review"
            className={({ isActive }) =>
              `min-h-[40px] px-4 py-2 rounded-lg text-sm font-medium transition ${isActive ? 'bg-amber-500 text-white' : 'text-amber-800 hover:bg-amber-100'}`
            }
          >
            錯題討論
          </NavLink>
          <NavLink
            to="/teacher/live"
            className={({ isActive }) =>
              `min-h-[40px] px-4 py-2 rounded-lg text-sm font-medium transition ${isActive ? 'bg-amber-500 text-white' : 'text-amber-800 hover:bg-amber-100'}`
            }
          >
            即時測驗
          </NavLink>
        </nav>
      </header>
      <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  )
}

function TeacherLayoutInner() {
  const [ready, setReady] = useState(false)
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
  if (!ready) return <div className="p-8 text-center text-amber-800">載入中…</div>
  return (
    <TeacherClassProvider fetchClasses={fetchClasses}>
      <TeacherNav />
    </TeacherClassProvider>
  )
}

export default function TeacherLayout() {
  return <TeacherLayoutInner />
}
