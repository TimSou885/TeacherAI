import { useState, useEffect } from 'react'
import { apiFetch } from '../../lib/api'

type FlagItem = {
  id: string
  conversation_id: string
  flag_type: string
  risk_score: number | null
  ai_summary: string | null
  status: string
  created_at: string
}

export default function AdminConversations() {
  const [flags, setFlags] = useState<FlagItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | ''>('pending')

  useEffect(() => {
    setLoading(true)
    const url = filter ? `/api/admin/conversation-flags?status=${filter}&limit=50` : '/api/admin/conversation-flags?limit=50'
    apiFetch(url, undefined, { preferTeacher: true })
      .then((res) => (res.ok ? res.json() : { flags: [] }))
      .then((data: { flags?: FlagItem[] }) => setFlags(data.flags ?? []))
      .finally(() => setLoading(false))
  }, [filter])

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">AI 智慧對話審核</h1>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter('pending')}
          className={`min-h-[40px] px-4 py-2 rounded-lg text-sm font-medium ${filter === 'pending' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-800'}`}
        >
          待審
        </button>
        <button
          type="button"
          onClick={() => setFilter('')}
          className={`min-h-[40px] px-4 py-2 rounded-lg text-sm font-medium ${filter === '' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-800'}`}
        >
          全部
        </button>
      </div>
      {loading ? (
        <p className="text-slate-600">載入中…</p>
      ) : flags.length === 0 ? (
        <p className="text-slate-600">尚無被標記的對話。</p>
      ) : (
        <ul className="space-y-4">
          {flags.map((f) => (
            <li key={f.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium text-slate-900">對話 {f.conversation_id.slice(0, 8)}…</span>
                <span className="text-slate-600">{f.flag_type}</span>
                {f.risk_score != null && (
                  <span className="text-amber-700">風險 {f.risk_score}/10</span>
                )}
                <span className="text-slate-500">{f.status}</span>
              </div>
              {f.ai_summary && (
                <p className="mt-2 text-slate-700 text-sm">{f.ai_summary}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">{f.created_at}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
