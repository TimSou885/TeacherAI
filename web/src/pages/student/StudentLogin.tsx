import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API_URL, setStudentSession } from '../../lib/api'

type StudentItem = { id: string; name: string; displayName: string; gradeLevel: number }

export default function StudentLogin() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'code' | 'list'>('code')
  const [joinCode, setJoinCode] = useState('')
  const [className, setClassName] = useState('')
  const [students, setStudents] = useState<StudentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function fetchClass() {
    const code = joinCode.trim().toUpperCase()
    if (!code) {
      setError('請輸入班級代碼')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/auth/class-by-code?joinCode=${encodeURIComponent(code)}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data?.message ?? '找不到該班級')
        return
      }
      setClassName(data.className ?? '')
      setStudents(data.students ?? [])
      setStep('list')
    } catch {
      setError('無法連線，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  async function loginAsStudent(studentId: string) {
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/auth/student-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ joinCode: joinCode.trim().toUpperCase(), studentId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.message ?? '登入失敗')
        return
      }
      setStudentSession({ token: data.token, student: data.student })
      navigate('/student/home', { replace: true })
    } catch {
      setError('無法連線，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'list') {
    return (
      <div className="min-h-screen bg-amber-50 flex flex-col items-center p-6 pt-12 relative">
        <Link to="/" className="absolute top-4 left-4 text-amber-700 text-sm underline hover:text-amber-900">
          返回首頁 · 老師登入
        </Link>
        <h1 className="text-xl font-bold text-amber-900 mb-1">{className}</h1>
        <p className="text-amber-800/80 text-sm mb-6">點你的名字進入</p>
        {error && (
          <p className="text-red-600 text-sm mb-4" role="alert">
            {error}
          </p>
        )}
        <div className="w-full max-w-sm space-y-3">
          {students.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => loginAsStudent(s.id)}
              disabled={loading}
              className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-white border-2 border-amber-200 text-amber-900 font-medium text-lg hover:bg-amber-100 hover:border-amber-300 transition touch-manipulation"
            >
              {s.displayName}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => { setStep('code'); setError(''); setJoinCode('') }}
          className="mt-8 text-amber-700 text-sm underline"
        >
          換一個班級代碼
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center p-6 relative">
      <Link to="/" className="absolute top-4 left-4 text-amber-700 text-sm underline hover:text-amber-900">
        返回首頁 · 老師登入
      </Link>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-amber-900 mb-2">學生登入</h1>
        <p className="text-amber-800/80 mb-6">輸入老師給的班級代碼</p>
        <input
          type="text"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder="例如 3A2026"
          className="w-full py-3 px-4 rounded-xl border-2 border-amber-200 text-lg text-amber-900 placeholder:text-amber-400 focus:border-amber-500 focus:outline-none mb-4"
          maxLength={20}
          autoFocus
        />
        {error && (
          <p className="text-red-600 text-sm mb-4" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={fetchClass}
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl bg-amber-500 text-white font-medium text-lg hover:bg-amber-600 disabled:opacity-60 transition"
        >
          {loading ? '載入中…' : '下一步'}
        </button>
      </div>
    </div>
  )
}
