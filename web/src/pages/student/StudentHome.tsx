import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { getStudentSession, clearStudentSession } from '../../lib/api'
import Chat from './Chat'
import Dictation from './Dictation'
import StrokePractice from './StrokePractice'
import Practice from './Practice'
import PracticeSession from './PracticeSession'
import ErrorBook from './ErrorBook'
import ErrorReviewSession from './ErrorReviewSession'

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

const practiceCategories = [
  { id: 'dictation' as const, label: '默書' },
  { id: 'stroke' as const, label: '筆順測驗' },
  { id: 'quiz' as const, label: '測驗' },
  { id: 'errorbook' as const, label: '錯題本' },
]

export function StudentPracticeTab() {
  const [practiceCategory, setPracticeCategory] = useState<'dictation' | 'stroke' | 'quiz' | 'errorbook'>('dictation')
  const [quizExercise, setQuizExercise] = useState<{ id: string; title: string } | null>(null)
  const [errorReviewItems, setErrorReviewItems] = useState<Parameters<typeof ErrorReviewSession>[0]['items'] | null>(null)

  const content =
    practiceCategory === 'dictation' ? (
      <Dictation />
    ) : practiceCategory === 'stroke' ? (
      <StrokePractice />
    ) : errorReviewItems ? (
      <ErrorReviewSession items={errorReviewItems} onFinish={() => setErrorReviewItems(null)} />
    ) : quizExercise ? (
      <PracticeSession
        exerciseId={quizExercise.id}
        title={quizExercise.title}
        onBack={() => setQuizExercise(null)}
      />
    ) : practiceCategory === 'errorbook' ? (
      <ErrorBook onStartReview={(items) => setErrorReviewItems(items)} />
    ) : (
      <Practice onSelectExercise={(id, title) => setQuizExercise({ id, title })} />
    )

  return (
    <div className="flex-1 overflow-hidden flex flex-col min-h-0">
      <div className="flex gap-2 p-4 bg-white border-b border-amber-100 shrink-0">
        {practiceCategories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={practiceCategory === cat.id}
            onClick={() => {
              setPracticeCategory(cat.id)
              if (cat.id !== 'quiz') setQuizExercise(null)
              if (cat.id !== 'errorbook') setErrorReviewItems(null)
            }}
            className={`min-h-[44px] flex-1 px-4 rounded-xl font-medium touch-manipulation transition ${
              practiceCategory === cat.id
                ? 'bg-amber-500 text-white'
                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {content}
      </div>
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
