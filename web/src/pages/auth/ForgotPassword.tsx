import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/teacher/reset-password`,
    })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <h1 className="text-xl font-bold text-amber-900 mb-4">重設密碼</h1>
          <p className="text-amber-800 mb-6">
            已寄出重設密碼信至 <strong>{email}</strong>，請查收並點擊信中的連結設定新密碼。
          </p>
          <Link
            to="/teacher/login"
            className="inline-block py-3 px-4 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 transition"
          >
            返回登入
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center p-6">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-xl font-bold text-amber-900 mb-6">忘記密碼</h1>
        <p className="text-amber-800/80 text-sm mb-4">輸入您的 Email，我們將寄送重設密碼連結。</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-amber-900 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
              required
              autoComplete="email"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-50"
          >
            {loading ? '寄送中…' : '寄送重設連結'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-amber-800/80">
          <Link to="/teacher/login" className="underline hover:text-amber-900">返回登入</Link>
        </p>
      </div>
    </div>
  )
}
