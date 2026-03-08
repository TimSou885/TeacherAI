import { useState } from 'react'
import { apiFetch } from '../lib/api'

export default function CreateClassForm({
  onSuccess,
}: {
  onSuccess: () => void
}) {
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('請輸入班級名稱')
      return
    }
    setLoading(true)
    try {
      const res = await apiFetch('/api/teacher/classes', {
        method: 'POST',
        body: JSON.stringify({
          name: trimmedName,
          join_code: joinCode.trim() || undefined,
        }),
      }, { preferTeacher: true })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(data.message ?? '建立失敗')
      }
      setName('')
      setJoinCode('')
      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : '建立失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 p-6 bg-white rounded-xl border-2 border-amber-200 max-w-md mx-auto text-left">
      <h3 className="text-lg font-semibold text-amber-900 mb-4">建立班級</h3>
      <p className="text-sm text-amber-700 mb-4">
        建立後會自動設定為您的班級，學生可用班級代碼登入。
      </p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-amber-900 mb-1">班級名稱</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：小三A班"
            className="w-full py-2 px-3 rounded-lg border-2 border-amber-200 text-amber-900 focus:border-amber-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-amber-900 mb-1">班級代碼（選填）</label>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 10))}
            placeholder="留空自動產生，例如 3A2026"
            className="w-full py-2 px-3 rounded-lg border-2 border-amber-200 text-amber-900 focus:border-amber-500 focus:outline-none"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-50"
        >
          {loading ? '建立中…' : '建立班級'}
        </button>
      </div>
    </form>
  )
}
