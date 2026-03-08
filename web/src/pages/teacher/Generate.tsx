import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '../../lib/api'
import { useTeacherClass } from '../../contexts/TeacherClassContext'
import QuestionPreview, { type ContentShape } from '../../components/teacher/QuestionPreview'

type Category = 'reading' | 'grammar' | 'vocabulary' | 'dictation' | 'reorder' | 'all'

const CATEGORY_LABELS: Record<Category, string> = {
  reading: '閱讀理解',
  grammar: '語文基礎',
  vocabulary: '詞語運用',
  dictation: '默書詞表',
  reorder: '排句成段',
  all: '一鍵生成全部',
}

type LessonTextItem = {
  id: string
  title: string
  source_text: string
  learning_objectives: string | null
  key_vocabulary: string | null
  textbook_ref: string | null
  created_at: string
}

function normalizeContent(raw: unknown): ContentShape {
  if (raw && typeof raw === 'object') {
    const c = raw as Record<string, unknown>
    if (Array.isArray(c.questions)) return { type: 'quiz', questions: c.questions as ContentShape['questions'] }
    if (Array.isArray(c.words)) return { type: 'dictation', words: c.words as ContentShape['words'] }
    if (Array.isArray(raw)) return { type: 'quiz', questions: raw as ContentShape['questions'] }
  }
  return { type: 'quiz', questions: [] }
}

export default function Generate() {
  const navigate = useNavigate()
  const location = useLocation()
  const { classes, classId } = useTeacherClass()
  const [sourceText, setSourceText] = useState('')
  const [learningObjectives, setLearningObjectives] = useState('')
  const [keyVocabulary, setKeyVocabulary] = useState('')
  const [textbookRef, setTextbookRef] = useState('')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | ''>('')
  const [category, setCategory] = useState<Category>('reading')
  const [gradeLevel, setGradeLevel] = useState(3)
  const [mode, setMode] = useState<'lesson' | 'error_book'>('lesson')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{
    single?: { id: string; generated_content: unknown }
    batch?: Array<{ category: string; id: string; generated_content: unknown }>
  } | null>(null)
  const [editedContent, setEditedContent] = useState<ContentShape | null>(null)
  const [editedBatch, setEditedBatch] = useState<Record<string, unknown>>({})
  const [publishTitle, setPublishTitle] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [lessonTexts, setLessonTexts] = useState<LessonTextItem[]>([])
  const [savingToLibrary, setSavingToLibrary] = useState(false)
  const [saveTitle, setSaveTitle] = useState('')

  const hasUnsavedEdits = Boolean(result && (editedContent ?? Object.keys(editedBatch).length > 0))
  useEffect(() => {
    if (!hasUnsavedEdits) return
    const h = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [hasUnsavedEdits])

  useEffect(() => {
    const state = location.state as { fromLessonPlan?: boolean; sourceText?: string; learningObjectives?: string; keyVocabulary?: string; textbookRef?: string } | null
    if (state?.fromLessonPlan && state.sourceText) {
      setSourceText(state.sourceText)
      if (state.learningObjectives) setLearningObjectives(state.learningObjectives)
      if (state.keyVocabulary) setKeyVocabulary(state.keyVocabulary)
      if (state.textbookRef) setTextbookRef(state.textbookRef)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    apiFetch('/api/lesson-texts', undefined, { preferTeacher: true })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('無法載入課文庫'))))
      .then((data: { items?: LessonTextItem[] }) => {
        if (!cancelled) setLessonTexts(data.items ?? [])
      })
      .catch(() => { if (!cancelled) setLessonTexts([]) })
    return () => { cancelled = true }
  }, [])

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
    setEditedContent(null)
    setEditedBatch({})
    try {
      const body: Record<string, unknown> = {
        class_id: classId,
        grade_level: gradeLevel,
        mode,
      }
      if (mode === 'lesson') {
        body.source_text = sourceText.trim()
        body.category = category
        if (learningObjectives.trim()) body.learning_objectives = learningObjectives.trim()
        if (keyVocabulary.trim()) body.key_vocabulary = keyVocabulary.trim()
        if (textbookRef.trim()) body.textbook_ref = textbookRef.trim()
        if (difficulty) body.difficulty = difficulty
      }
      const res = await apiFetch('/api/generate', {
        method: 'POST',
        body: JSON.stringify(body),
      }, { preferTeacher: true })
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
        setEditedContent(normalizeContent(data.generated_content))
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
      }, { preferTeacher: true })
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(d.message ?? '發佈失敗')
      }
      await res.json()
      setResult(null)
      setEditedContent(null)
      setEditedBatch({})
      setPublishTitle('')
      toast.success('已發佈！', {
        action: { label: '前往內容管理', onClick: () => navigate('/teacher/content') },
        duration: 5000,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : '發佈失敗')
    } finally {
      setPublishing(false)
    }
  }

  async function handleSaveToLibrary() {
    const title = saveTitle.trim() || `課文 ${new Date().toLocaleDateString('zh-TW')}`
    if (!sourceText.trim()) {
      setError('請先輸入課文')
      return
    }
    setSavingToLibrary(true)
    setError('')
    try {
      const res = await apiFetch('/api/lesson-texts', {
        method: 'POST',
        body: JSON.stringify({
          title,
          source_text: sourceText.trim(),
          learning_objectives: learningObjectives.trim() || undefined,
          key_vocabulary: keyVocabulary.trim() || undefined,
          textbook_ref: textbookRef.trim() || undefined,
        }),
      }, { preferTeacher: true })
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(d.message ?? '儲存失敗')
      }
      const data = (await res.json()) as { id?: string }
      setSaveTitle('')
      const updated = [...lessonTexts, { id: data.id!, title, source_text: sourceText, learning_objectives: learningObjectives || null, key_vocabulary: keyVocabulary || null, textbook_ref: textbookRef || null, created_at: new Date().toISOString() }]
      setLessonTexts(updated)
      toast.success('已儲存到課文庫')
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存失敗')
    } finally {
      setSavingToLibrary(false)
    }
  }

  const currentSingleContent = editedContent ?? (result?.single ? normalizeContent(result.single.generated_content) : null)

  function copyQuestionsToClipboard() {
    const content = result?.single ? (currentSingleContent ?? normalizeContent(result.single.generated_content)) : result?.batch?.[0] ? normalizeContent((editedBatch[result.batch[0].category] ?? result.batch[0].generated_content) as object) : null
    if (!content) return
    const lines: string[] = []
    if (content.words) {
      content.words.forEach((w: { word?: string; pinyin?: string; hint?: string }, i: number) => {
        lines.push(`${i + 1}. ${w.word ?? ''} ${w.pinyin ? `（${w.pinyin}）` : ''} ${w.hint ? `— ${w.hint}` : ''}`)
      })
    } else if (content.questions) {
      content.questions.forEach((q: Record<string, unknown>, i: number) => {
        const t = q.type ?? ''
        const qText = (q.question ?? q.word ?? '').toString()
        lines.push(`${i + 1}. [${t}] ${qText}`)
        if (Array.isArray(q.options)) {
          q.options.forEach((o: unknown, j: number) => {
            const correct = (q.correct === j || (t === 'multiple_choice' && q.correct === j)) ? ' ✓' : ''
            lines.push(`   ${String.fromCharCode(65 + j)}. ${(o ?? '').toString()}${correct}`)
          })
        }
        if ((q.correct ?? q.reference_answer) && !Array.isArray(q.options)) {
          lines.push(`   答案：${String(q.correct ?? q.reference_answer ?? '')}`)
        }
      })
    }
    const text = lines.join('\n')
    if (text) {
      navigator.clipboard.writeText(text).then(() => toast.success('已複製到剪貼簿，可貼到 Word'))
    }
  }

  function exportAsExamSheet() {
    const content = result?.single ? (currentSingleContent ?? normalizeContent(result.single.generated_content)) : null
    if (!content) return
    const title = (publishTitle || '練習').replace(/</g, '&lt;')
    const meta = `${textbookRef ? `教科書：${textbookRef.replace(/</g, '&lt;')}　` : ''}年級：小${gradeLevel}`
    let body = ''
    if (content.words) {
      body = content.words.map((w: { word?: string; pinyin?: string }, i: number) =>
        `${i + 1}. ____________（${w.word ?? ''} ${w.pinyin ?? ''}）`
      ).join('\n')
    } else if (content.questions) {
      body = content.questions.map((q: Record<string, unknown>, i: number) => {
        let s = `${i + 1}. ${(q.question ?? '').toString().replace(/</g, '&lt;')}\n`
        if (Array.isArray(q.options)) {
          s += `   ${(q.options as string[]).map((o, j) => `(${String.fromCharCode(65 + j)}) ${o}`).join('　')}`
        }
        return s
      }).join('\n\n')
    }
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;padding:24px;max-width:600px;margin:0 auto;line-height:1.8}h2{margin-bottom:0.5em}.meta{color:#666;margin-bottom:1.5em}.exam-header{display:flex;flex-wrap:wrap;gap:1em;margin-bottom:2em;font-size:0.9em}.exam-header span{border-bottom:1px solid #000;padding:0 0.5em;min-width:4em}pre{white-space:pre-wrap;font-family:inherit}</style></head><body><h2>${title}</h2><p class="meta">${meta}</p><div class="exam-header"><span>學校：____________</span><span>班級：____________</span><span>姓名：____________</span><span>座號：______</span><span>得分：______</span></div><pre>${body.replace(/</g, '&lt;')}</pre></body></html>`
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank', 'noopener')
    if (win) {
      win.onload = () => { win.print(); win.onafterprint = () => URL.revokeObjectURL(url) }
    } else {
      URL.revokeObjectURL(url)
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
              <input type="radio" name="mode" checked={mode === 'lesson'} onChange={() => setMode('lesson')} className="w-4 h-4" />
              <span>根據課文出題</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="mode" checked={mode === 'error_book'} onChange={() => setMode('error_book')} className="w-4 h-4" />
              <span>根據錯題出複習題</span>
            </label>
          </div>
        </div>

        {classes.length === 0 && (
          <p className="text-amber-700 text-sm">請先在 Supabase 建立班級並設定 teacher_id</p>
        )}

        {mode === 'lesson' && (
          <>
            {lessonTexts.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1">從課文庫選取</label>
                <select
                  className="w-full min-h-[44px] py-2 px-3 rounded-lg border-2 border-amber-200"
                  value=""
                  onChange={(e) => {
                    const id = e.target.value
                    if (!id) return
                    const item = lessonTexts.find((l) => l.id === id)
                    if (item) {
                      setSourceText(item.source_text)
                      setLearningObjectives(item.learning_objectives ?? '')
                      setKeyVocabulary(item.key_vocabulary ?? '')
                      setTextbookRef(item.textbook_ref ?? '')
                      setSaveTitle(item.title)
                      e.target.value = ''
                    }
                  }}
                >
                  <option value="">— 選擇課文 —</option>
                  {lessonTexts.map((l) => (
                    <option key={l.id} value={l.id}>{l.title}</option>
                  ))}
                </select>
              </div>
            )}

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
              <label className="block text-sm font-medium text-amber-900 mb-1">教學目標（選填）</label>
              <textarea
                value={learningObjectives}
                onChange={(e) => setLearningObjectives(e.target.value)}
                placeholder="本課教學目標，讓 AI 對齊出題方向…"
                rows={2}
                className="w-full py-2 px-3 rounded-lg border-2 border-amber-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-amber-900 mb-1">重點詞彙（選填）</label>
              <textarea
                value={keyVocabulary}
                onChange={(e) => setKeyVocabulary(e.target.value)}
                placeholder="本課重點詞，默書/詞語題會優先涵蓋…"
                rows={2}
                className="w-full py-2 px-3 rounded-lg border-2 border-amber-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-amber-900 mb-1">教科書對照（選填）</label>
              <input
                type="text"
                value={textbookRef}
                onChange={(e) => setTextbookRef(e.target.value)}
                placeholder="例如：三上第五課、單元三"
                className="w-full py-2 px-3 rounded-lg border-2 border-amber-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-amber-900 mb-1">難度（選填）</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard' | '')}
                className="w-full min-h-[44px] py-2 px-3 rounded-lg border-2 border-amber-200"
              >
                <option value="">適中</option>
                <option value="easy">偏易（多基礎題）</option>
                <option value="medium">適中</option>
                <option value="hard">偏難（可含進階題）</option>
              </select>
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

            {sourceText.trim() && (
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-sm font-medium text-amber-900 mb-1">儲存到課文庫</label>
                  <input
                    type="text"
                    value={saveTitle}
                    onChange={(e) => setSaveTitle(e.target.value)}
                    placeholder="例如：第五課 耳朵上的綠星星"
                    className="w-full py-2 px-3 rounded-lg border-2 border-amber-200"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveToLibrary}
                  disabled={savingToLibrary}
                  className="min-h-[44px] px-4 py-2 rounded-xl border-2 border-amber-300 text-amber-800 font-medium hover:bg-amber-50 disabled:opacity-50"
                >
                  {savingToLibrary ? '儲存中…' : '儲存'}
                </button>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-red-600 text-sm">{error}</p>
            <button type="button" onClick={() => setError('')} className="text-sm text-amber-700 underline hover:text-amber-900">
              關閉
            </button>
            {!result && (
              <button type="button" onClick={() => { setError(''); handleGenerate() }} className="text-sm text-amber-700 underline hover:text-amber-900 font-medium">
                重試生成
              </button>
            )}
          </div>
        )}

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
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copyQuestionsToClipboard}
                  className="px-4 py-2 rounded-lg border-2 border-amber-300 text-amber-800 text-sm font-medium hover:bg-amber-50"
                >
                  複製題目（貼到 Word）
                </button>
                <button
                  type="button"
                  onClick={exportAsExamSheet}
                  className="px-4 py-2 rounded-lg border-2 border-amber-300 text-amber-800 text-sm font-medium hover:bg-amber-50"
                >
                  列印試卷格式
                </button>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                <QuestionPreview
                  content={currentSingleContent ?? normalizeContent(result.single.generated_content)}
                  onChange={(next) => setEditedContent(next)}
                />
              </div>
              <button
                type="button"
                onClick={() => handlePublish(
                  result.single!.id,
                  editedContent ?? result.single!.generated_content,
                  ''
                )}
                disabled={publishing}
                className="min-h-[44px] px-6 py-2 rounded-xl bg-amber-500 text-white font-medium disabled:opacity-50"
              >
                {publishing ? '發佈中…' : '發佈為練習'}
              </button>
            </div>
          )}

          {result.batch && (
            <div className="space-y-4">
              {result.batch.map((r) => {
                const raw = editedBatch[r.category] ?? r.generated_content
                const isError = raw && typeof raw === 'object' && 'error' in raw
                const content = isError ? null : normalizeContent(raw)
                return (
                  <div key={r.category} className="border-b border-amber-100 pb-4 last:border-0">
                    <p className="font-medium text-amber-900 mb-2">{CATEGORY_LABELS[r.category as Category] ?? r.category}</p>
                    {isError ? (
                      <p className="text-red-600 text-sm">{(raw as { error: string }).error}</p>
                    ) : content ? (
                      <>
                        <div className="max-h-[280px] overflow-y-auto mb-2">
                          <QuestionPreview
                            content={content}
                            onChange={(next) => setEditedBatch((prev) => ({ ...prev, [r.category]: next }))}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handlePublish(r.id, editedBatch[r.category] ?? r.generated_content, r.category)}
                          disabled={publishing || !r.id}
                          className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-medium disabled:opacity-50"
                        >
                          發佈此範疇
                        </button>
                      </>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
