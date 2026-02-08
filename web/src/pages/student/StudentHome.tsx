import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { getStudentSession, clearStudentSession } from '../../lib/api'
import Chat from './Chat'

const tabs = [
  { path: 'chat', label: '對話', icon: '💬' },
  { path: 'practice', label: '練習', icon: '📚' },
  { path: 'writing', label: '作文', icon: '✍️' },
  { path: 'me', label: '我的', icon: '👤' },
] as const

export default function StudentHome() {
  const navigate = useNavigate()
  const location = useLocation()
  const session = getStudentSession()
  const path = location.pathname.replace(/^\/student\/home\/?/, '').replace(/^\//, '') || 'chat'
  const currentTab = tabs.find((t) => t.path === path)?.path ?? 'chat'

  function goTo(tab: string) {
    if (tab === 'chat') navigate('/student/home/chat')
    else if (tab === 'practice') navigate('/student/home/practice')
    else if (tab === 'writing') navigate('/student/home/writing')
    else if (tab === 'me') navigate('/student/home/me')
  }

  if (!session) {
    navigate('/student', { replace: true })
    return null
  }

  return (
    <div className="flex flex-col h-screen bg-amber-50 safe-area-pb">
      <main className="flex-1 overflow-hidden flex flex-col min-h-0">
        <Outlet />
      </main>

      <nav
        className="flex bg-white border-t border-amber-100 shrink-0"
        style={{ minHeight: 44 }}
        role="tablist"
      >
        {tabs.map((t) => (
          <button
            key={t.path}
            type="button"
            role="tab"
            aria-selected={currentTab === t.path}
            onClick={() => goTo(t.path)}
            className="flex-1 flex flex-col items-center justify-center py-2 min-h-[44px] touch-manipulation text-amber-900 hover:bg-amber-50/50 transition"
          >
            <span className="text-lg" aria-hidden>{t.icon}</span>
            <span className="text-[16px]">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

export function StudentChatTab() {
  return <Chat isStudent />
}

export function StudentPracticeTab() {
  return (
    <div className="flex-1 overflow-auto p-6 flex flex-col items-center justify-center text-amber-800">
      <p className="text-lg font-medium">練習</p>
      <p className="text-sm mt-2">即將推出：默書、閱讀理解、語文基礎等練習</p>
    </div>
  )
}

export function StudentWritingTab() {
  return (
    <div className="flex-1 overflow-auto p-6 flex flex-col items-center justify-center text-amber-800">
      <p className="text-lg font-medium">作文</p>
      <p className="text-sm mt-2">Phase 2 推出</p>
    </div>
  )
}

export function StudentMeTab() {
  const session = getStudentSession()
  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-md mx-auto">
        <h2 className="text-lg font-semibold text-amber-900 mb-4">我的</h2>
        <p className="text-amber-800">你好，{session?.student.name}！</p>
        <button
          type="button"
          onClick={() => {
            clearStudentSession()
            window.location.href = '/student'
          }}
          className="mt-6 min-h-[44px] px-6 py-3 rounded-xl bg-amber-100 text-amber-900 font-medium hover:bg-amber-200 touch-manipulation"
        >
          登出
        </button>
      </div>
    </div>
  )
}
