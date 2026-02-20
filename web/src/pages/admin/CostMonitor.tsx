import { useState, useEffect } from 'react'
import { apiFetch } from '../../lib/api'

type CostSummary = {
  totalUsd: number
  byService: Record<string, number>
  rows: Array<{ service: string; estimated_cost_usd: number; created_at: string }>
}

export default function CostMonitor() {
  const [summary, setSummary] = useState<CostSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => {
    setLoading(true)
    const url = month ? `/api/admin/cost?month=${encodeURIComponent(month)}` : '/api/admin/cost'
    apiFetch(url, undefined, { preferTeacher: true })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: CostSummary | null) => setSummary(data ?? null))
      .finally(() => setLoading(false))
  }, [month])

  const totalUsd = summary?.totalUsd ?? 0
  const byService = summary?.byService ?? {}

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">成本監控</h1>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-700">月份</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
        />
      </div>
      {loading ? (
        <p className="text-slate-600">載入中…</p>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-medium text-slate-900 mb-2">預估成本（USD）</h2>
            <p className="text-3xl font-bold text-slate-900">${totalUsd.toFixed(4)}</p>
            <p className="text-sm text-slate-600 mt-1">約 HKD {(totalUsd * 7.8).toFixed(2)}（僅供參考）</p>
          </div>
          {Object.keys(byService).length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="font-medium text-slate-900 mb-2">依服務</h2>
              <ul className="space-y-2">
                {Object.entries(byService).map(([svc, usd]) => (
                  <li key={svc} className="flex justify-between text-sm">
                    <span className="text-slate-700">{svc}</span>
                    <span className="font-medium text-slate-900">${Number(usd).toFixed(4)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-medium text-slate-900 mb-2">預算告警</h2>
            <p className="text-sm text-slate-600">（預留：可設定預算上限與告警）</p>
          </section>
        </>
      )}
    </div>
  )
}
