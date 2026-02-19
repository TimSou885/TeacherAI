import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getStudentSession } from '../lib/api'

export default function Home() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const studentSession = getStudentSession()
  useEffect(() => {
    if (studentSession) navigate('/student/home', { replace: true })
  }, [navigate, studentSession])

  if (studentSession) return null
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <p className="text-amber-800">載入中…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-amber-900 mb-2">EduSpark AI 中文學伴</h1>
        <p className="text-amber-800/80 mb-6">溫暖、有耐心的中文學習助手</p>
        <Link
          to="/student"
          className="inline-block w-full py-3 px-4 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 transition mb-3"
        >
          學生登入
        </Link>
        {user ? (
          <>
            <Link
              to="/chat"
              className="inline-block w-full py-3 px-4 rounded-xl border-2 border-amber-400 text-amber-800 font-medium hover:bg-amber-50 transition mb-3"
            >
              進入 AI 對話
            </Link>
            <Link
              to="/teacher"
              className="inline-block w-full py-3 px-4 rounded-xl border-2 border-amber-400 text-amber-800 font-medium hover:bg-amber-50 transition mb-3"
            >
              教師工作區
            </Link>
            <Link
              to="/teacher/generate"
              className="inline-block w-full py-3 px-4 rounded-xl border-2 border-amber-400 text-amber-800 font-medium hover:bg-amber-50 transition"
            >
              AI 出題
            </Link>
          </>
        ) : (
          <Link
            to="/login"
            className="inline-block w-full py-3 px-4 rounded-xl border-2 border-amber-400 text-amber-800 font-medium hover:bg-amber-50 transition"
          >
            老師登入
          </Link>
        )}
      </div>
    </div>
  )
}
