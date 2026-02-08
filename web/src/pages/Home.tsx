import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Home() {
  const { user, loading } = useAuth()

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
        {user ? (
          <Link
            to="/chat"
            className="inline-block w-full py-3 px-4 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 transition"
          >
            進入 AI 對話
          </Link>
        ) : (
          <Link
            to="/login"
            className="inline-block w-full py-3 px-4 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 transition"
          >
            老師登入
          </Link>
        )}
      </div>
    </div>
  )
}
