import { useState } from 'react'
import { apiFetch } from '../../lib/api'
import { useTeacherClass } from '../../contexts/TeacherClassContext'

type Category = 'reading' | 'grammar' | 'vocabulary' | 'dictation' | 'reorder' | 'all'

const CATEGORY_LABELS: Record<Category, string> = {
  reading: '閱讀理解',
  grammar: '語文基礎',
  vocabulary: '詞語運用',
  dictation: '默書詞表',
  reorder: '排句成段',
  all: '一鍵生成全部',
}

export default function Generate() {
  const { classes, classId } = useTeacherClass()
  const [sourceText, setSourceText] = useState('')
  const [category, setCategory] = useState<Category>('reading')
  const [gradeLevel, setGradeLevel] = useState(3)
  const [mode, setMode] = useState<'lesson' | 'error_book'>('lesson')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{
    single?: { id: string; generated_content: unknown }
    batch?: Array<{ category: string; id: string; generated_content: unknown }>
  } | null>(null)
  const [publishTitle, setPublishTitle] = useState('')
  const [publishing, setPublishing] = useState(false)

  async function handleGenerate() {
    if (!classId) {
      setError('請選擇班級')
      return
    }
    if (mode === 'lesson' && !sourceText.trim()) {
      setError('請輸入課文或知識點')
      return
    }
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const body: Record<string, unknown> = {
        class_id: classId,
        grade_level: gradeLevel,
        mode,
      }
      if (mode === 'lesson') {
        body.source_text = sourceText.trim()
        body.category = category
      }
      const res = await apiFetch('/api/generate', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(d.message ?? `請求失敗 ${res.status}`)
      }
      const data = (await res.json()) as {
        id?: string
        generated_content?: unknown
        batch?: boolean
        results?: Array<{ category: string; id: string; generated_content: unknown }>
      }
      if (data.batch && data.results) {
        setResult({ batch: data.results })
      } else {
        setResult({ single: { id: data.id!, generated_content: data.generated_content } })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失敗')
    } finally {
      setLoading(false)
    }
  }

  async function handlePublish(draftId: string, content: unknown, cat: string) {
    const title = publishTitle.trim() || `AI 生成 ${cat} ${new Date().toLocaleDateString('zh-TW')}`
    setPublishing(true)
    setError('')
    try {
      const res = await apiFetch('/api/generate/publish', {
        method: 'POST',
        body: JSON.stringify({
          draft_id: draftId,
          title,
          approved_content: content,
        }),
      })
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(d.message ?? '發佈失敗')
      }
      const data = (await res.json()) as { exercise_id?: string }
      setResult(null)
      setPublishTitle('')
      alert(`已發佈！練習 ID：${data.exercise_id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '發佈失敗')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-amber-900 mb-6">AI 出題</h1>

      <div className="bg-white rounded-xl border border-amber-100 p-6 space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-amber-900 mb-1">模式</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === 'lesson'}
                  onChange={() => setMode('lesson')}
                  className="w-4 h-4"
                />
                <span>根據課文出題</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === 'error_book'}
                  onChange={() => setMode('error_book')}
                  className="w-4 h-4"
                />
                <span>根據錯題出複習題</span>
              </label>
            </div>
          </div>

          {classes.length === 0 && (
            <p className="text-amber-700 text-sm">請先在 Supabase 建立班級並設定 teacher_id</p>
          )}

          {mode === 'lesson' && (
            <>
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1">課文或知識點</label>
                <textarea
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder="貼上課文全文，或輸入本週教學重點…"
                  rows={6}
                  className="w-full py-2 px-3 rounded-lg border-2 border-amber-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1">範疇</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className="w-full min-h-[44px] py-2 px-3 rounded-lg border-2 border-amber-200"
                >
                  {(Object.entries(CATEGORY_LABELS) as [Category, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1">年級</label>
                <select
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(Number(e.target.value))}
                  className="w-full min-h-[44px] py-2 px-3 rounded-lg border-2 border-amber-200"
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>小{n}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || (mode === 'lesson' && !sourceText.trim())}
            className="min-h-[44px] w-full px-6 py-3 rounded-xl bg-amber-500 text-white font-medium disabled:opacity-50 hover:bg-amber-600"
          >
            {loading ? '生成中…' : mode === 'error_book' ? '根據錯題生成複習題' : '生成'}
          </button>
        </div>

        {result && (
          <div className="bg-white rounded-xl border border-amber-100 p-6 space-y-4">
            <h2 className="font-medium text-amber-900">預覽與發佈</h2>
            <div>
              <label className="block text-sm font-medium text-amber-900 mb-1">練習標題</label>
              <input
                type="text"
                value={publishTitle}
                onChange={(e) => setPublishTitle(e.target.value)}
                placeholder="例如：第五課閱讀理解"
                className="w-full min-h-[44px] py-2 px-3 rounded-lg border-2 border-amber-200"
              />
            </div>

            {result.single && (
              <div className="space-y-3">
                <pre className="p-4 bg-amber-50 rounded-lg text-sm overflow-auto max-h-60">
                  {JSON.stringify(result.single.generated_content, null, 2)}
                </pre>
                <button
                  type="button"
                  onClick={() => handlePublish(result.single!.id, result.single!.generated_content, '')}
                  disabled={publishing}
                  className="min-h-[44px] px-6 py-2 rounded-xl bg-amber-500 text-white font-medium disabled:opacity-50"
                >
                  {publishing ? '發佈中…' : '發佈為練習'}
                </button>
              </div>
            )}

            {result.batch && (
              <div className="space-y-4">
                {result.batch.map((r) => (
                  <div key={r.category} className="border-b border-amber-100 pb-4 last:border-0">
                    <p className="font-medium text-amber-900 mb-2">{CATEGORY_LABELS[r.category as Category] ?? r.category}</p>
                    {('error' in (r.generated_content as object)) ? (
                      <p className="text-red-600 text-sm">{(r.generated_content as { error: string }).error}</p>
                    ) : (
                      <>
                        <pre className="p-4 bg-amber-50 rounded-lg text-xs overflow-auto max-h-40 mb-2">
                          {JSON.stringify(r.generated_content, null, 2)}
                        </pre>
                        <button
                          type="button"
                          onClick={() => handlePublish(r.id, r.generated_content, r.category)}
                          disabled={publishing || !r.id}
                          className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-medium disabled:opacity-50"
                        >
                          發佈此範疇
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
    </div>
  )
}
