import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '../../lib/api'
import { useTeacherClass } from '../../contexts/TeacherClassContext'
import mammoth from 'mammoth'
import { exportPptPoc, exportPptFromLessonPlan } from '../../lib/exportPpt'

const BLOCK_TYPES = ['導入', '新授', '練習', '總結'] as const
type BlockType = (typeof BLOCK_TYPES)[number]

const ACTIVITY_OPTIONS: Record<BlockType, string[]> = {
  導入: ['故事預測', '看圖說話', '提問引導', '影片/圖片引入'],
  新授: ['圖片排序', '關鍵詞配對', '朗讀示範', '師生共讀', '角色扮演'],
  練習: ['連接詞填空', '口頭複述', '小組討論', '寫作練習'],
  總結: ['重點回顧', '價值觀昇華', '延伸提問'],
}

type LessonBlock = {
  id: string
  type: BlockType
  activity: string
  script: Array<{ role: 'teacher' | 'student'; content: string; action?: string }>
  durationMinutes: number
}

type LessonTextItem = {
  id: string
  title: string
  source_text: string
  learning_objectives: string | null
  key_vocabulary: string | null
  textbook_ref?: string | null
}

const STORY_RETELL_TEMPLATE: Omit<LessonBlock, 'id'>[] = [
  { type: '新授', activity: '圖片排序', script: [], durationMinutes: 5 },
  { type: '新授', activity: '關鍵詞配對', script: [], durationMinutes: 5 },
  { type: '練習', activity: '連接詞填空', script: [], durationMinutes: 8 },
]

const STUDENT_PROFILE_OPTIONS = [
  { id: 'visual', label: '圖像思維為主' },
  { id: 'short_attention', label: '注意力時間較短' },
  { id: 'oral_weak', label: '口語表達待加強' },
  { id: 'mixed_ability', label: '班級程度差異大' },
]

function genId() {
  return `b-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export default function LessonPlan() {
  const navigate = useNavigate()
  const { classId } = useTeacherClass()
  const [title, setTitle] = useState('')
  const [sourceText, setSourceText] = useState('')
  const [gradeLevel, setGradeLevel] = useState(3)
  const [durationMinutes, setDurationMinutes] = useState(40)
  const [strategyType, setStrategyType] = useState<string>('')
  const [blocks, setBlocks] = useState<LessonBlock[]>([])
  const [lessonTexts, setLessonTexts] = useState<LessonTextItem[]>([])
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null)
  const [savedPlans, setSavedPlans] = useState<Array<{ id: string; title: string }>>([])
  const [studentProfile, setStudentProfile] = useState<string[]>([])
  const [propsList, setPropsList] = useState<string[]>([])
  const [boardLayout, setBoardLayout] = useState('')
  const [generatingProps, setGeneratingProps] = useState(false)
  const [generatingBoard, setGeneratingBoard] = useState(false)
  const [generatingTimes, setGeneratingTimes] = useState(false)
  const [parsedDoc, setParsedDoc] = useState<{ learning_objectives?: string[]; key_vocabulary?: string[]; core_values?: string; core_concept?: string; core_question?: string } | null>(null)
  const [coreConcept, setCoreConcept] = useState('')
  const [coreQuestion, setCoreQuestion] = useState('')
  const [keyQuestions, setKeyQuestions] = useState<string[]>([])
  const [planMode, setPlanMode] = useState<'detailed' | 'brief'>('detailed')
  const [assessmentDesign, setAssessmentDesign] = useState('')
  const [generatingKeyQuestions, setGeneratingKeyQuestions] = useState(false)
  const [generatingAssessment, setGeneratingAssessment] = useState(false)
  const [parsingDoc, setParsingDoc] = useState(false)
  const [climax, setClimax] = useState('')
  const [homework, setHomework] = useState<string[]>([])
  const [textbookRef, setTextbookRef] = useState('')
  const [generatingClimax, setGeneratingClimax] = useState(false)
  const [generatingHomework, setGeneratingHomework] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [savingToTexts, setSavingToTexts] = useState(false)
  const [rightPanelOpen, setRightPanelOpen] = useState<Record<string, boolean>>({
    keyQuestions: true, assessment: true, climax: true, homework: true, props: true, board: true,
  })
  const [blockCollapsed, setBlockCollapsed] = useState<Record<string, boolean>>({})
  const [tabPanel, setTabPanel] = useState<'basic' | 'blocks' | 'assist'>('basic')
  const [dismissedHint, setDismissedHint] = useState(false)

  useEffect(() => {
    if (!isDirty) return
    const h = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [isDirty])

  useEffect(() => {
    let cancelled = false
    apiFetch('/api/lesson-texts', undefined, { preferTeacher: true })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('無法載入'))))
      .then((data: { items?: LessonTextItem[] }) => {
        if (!cancelled) setLessonTexts(data.items ?? [])
      })
      .catch(() => { if (!cancelled) setLessonTexts([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    apiFetch('/api/lesson-plans', undefined, { preferTeacher: true })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('無法載入'))))
      .then((data: { items?: Array<{ id: string; title: string }> }) => {
        if (!cancelled) setSavedPlans(data.items ?? [])
      })
      .catch(() => { if (!cancelled) setSavedPlans([]) })
    return () => { cancelled = true }
  }, [saving])

  async function loadPlan(id: string) {
    try {
      const res = await apiFetch(`/api/lesson-plans/${id}`, undefined, { preferTeacher: true })
      if (!res.ok) {
        let msg = res.status === 404 ? '找不到此教案' : res.status === 401 ? '請重新登入' : '無法載入'
        try {
          const errBody = await res.clone().json().catch(() => null) as { message?: string } | null
          if (errBody?.message) msg += `（${errBody.message}）`
        } catch { /* ignore */ }
        throw new Error(msg)
      }
      const data = (await res.json()) as {
        id: string
        title: string
        source_text: string | null
        grade_level: number
        duration_minutes: number
        strategy_type: string | null
        blocks: LessonBlock[]
        student_profile?: string | null
        textbook_ref?: string | null
        core_concept?: string | null
        core_question?: string | null
        key_questions?: string[]
        plan_mode?: string
        assessment_design?: string | null
      }
      setSavedId(data.id)
      setTitle(data.title)
      setSourceText(data.source_text ?? '')
      setGradeLevel(data.grade_level ?? 3)
      setDurationMinutes(data.duration_minutes ?? 40)
      setStrategyType(data.strategy_type ?? '')
      setBlocks((data.blocks ?? []).map((b) => ({ ...b, id: b.id || genId() })))
      setStudentProfile(data.student_profile ? data.student_profile.split(',').map((s) => s.trim()).filter(Boolean) : [])
      setTextbookRef(data.textbook_ref ?? '')
      setCoreConcept(data.core_concept ?? '')
      setCoreQuestion(data.core_question ?? '')
      setKeyQuestions(Array.isArray(data.key_questions) ? data.key_questions : [])
      setPlanMode(data.plan_mode === 'brief' ? 'brief' : 'detailed')
      setAssessmentDesign(data.assessment_design ?? '')
      setIsDirty(false)
      setError('')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '載入失敗'
      setError(msg)
      toast.error(msg)
    }
  }

  function applyStrategyTemplate(type: string) {
    setStrategyType(type)
    if (type === 'story_retell') {
      setBlocks(STORY_RETELL_TEMPLATE.map((b) => ({ ...b, id: genId() })))
    } else if (type === '') {
      setBlocks([])
    }
    setIsDirty(true)
  }

  function addBlock(type: BlockType = '新授') {
    const opts = ACTIVITY_OPTIONS[type]
    setBlocks((prev) => [
      ...prev,
      {
        id: genId(),
        type,
        activity: opts[0] ?? '師生討論',
        script: [],
        durationMinutes: 5,
      },
    ])
    setIsDirty(true)
  }

  function updateBlock(id: string, patch: Partial<LessonBlock>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)))
    setIsDirty(true)
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
    setIsDirty(true)
  }

  function moveBlock(id: string, dir: 'up' | 'down') {
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.id === id)
      if (i < 0) return prev
      const j = dir === 'up' ? i - 1 : i + 1
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
    setIsDirty(true)
  }

  async function generateScript(blockIndex: number) {
    const block = blocks[blockIndex]
    if (!block || !sourceText.trim()) {
      setError('請先輸入課文')
      return
    }
    setGeneratingIndex(blockIndex)
    setError('')
    try {
      const res = await apiFetch('/api/lesson-plans/generate-script', {
        method: 'POST',
        body: JSON.stringify({
          block_type: block.type,
          activity: block.activity,
          source_text: sourceText,
          grade_level: gradeLevel,
          duration_minutes: block.durationMinutes,
          student_profile: studentProfile.length > 0
            ? STUDENT_PROFILE_OPTIONS.filter((o) => studentProfile.includes(o.id)).map((o) => o.label).join('、')
            : undefined,
        }),
      }, { preferTeacher: true })
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(d.message ?? '生成失敗')
      }
      const data = (await res.json()) as { script?: Array<{ role: string; content: string; action?: string }> }
      const script = data.script ?? []
      updateBlock(block.id, { script: script as LessonBlock['script'] })
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成腳本失敗')
    } finally {
      setGeneratingIndex(null)
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      setError('請輸入教案標題')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await apiFetch('/api/lesson-plans', {
        method: 'POST',
        body: JSON.stringify({
          id: savedId || undefined,
          title: title.trim(),
          source_text: sourceText.trim() || undefined,
          class_id: classId || undefined,
          grade_level: gradeLevel,
          duration_minutes: durationMinutes,
          strategy_type: strategyType || undefined,
          blocks,
          student_profile: studentProfile.length > 0 ? studentProfile.join(',') : undefined,
          textbook_ref: textbookRef.trim() || undefined,
          core_concept: coreConcept.trim() || undefined,
          core_question: coreQuestion.trim() || undefined,
          key_questions: keyQuestions.length > 0 ? keyQuestions : undefined,
          plan_mode: planMode,
          assessment_design: assessmentDesign.trim() || undefined,
        }),
      }, { preferTeacher: true })
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(d.message ?? '儲存失敗')
      }
      const d = (await res.json()) as { id?: string }
      if (d.id) setSavedId(d.id)
      setIsDirty(false)
      toast.success('已儲存')
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  const totalMinutes = blocks.reduce((s, b) => s + b.durationMinutes, 0)

  function toggleProfile(id: string) {
    setStudentProfile((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
    setIsDirty(true)
  }

  function updateKeyQuestion(i: number, val: string) {
    setKeyQuestions((prev) => {
      const next = [...prev]
      next[i] = val
      return next
    })
    setIsDirty(true)
  }
  function addKeyQuestion() { setKeyQuestions((p) => [...p, '']); setIsDirty(true) }
  function removeKeyQuestion(i: number) { setKeyQuestions((p) => p.filter((_, j) => j !== i)); setIsDirty(true) }
  function updateHomework(i: number, val: string) {
    setHomework((prev) => { const next = [...prev]; next[i] = val; return next })
    setIsDirty(true)
  }
  function addHomework() { setHomework((p) => [...p, '']); setIsDirty(true) }
  function removeHomework(i: number) { setHomework((p) => p.filter((_, j) => j !== i)); setIsDirty(true) }
  function toggleRightSection(key: string) {
    setRightPanelOpen((p) => ({ ...p, [key]: !p[key] }))
  }
  function toggleBlockCollapse(id: string) {
    setBlockCollapsed((p) => ({ ...p, [id]: !p[id] }))
  }

  async function suggestTimes() {
    if (blocks.length === 0) { setError('請先新增環節'); return }
    setGeneratingTimes(true)
    setError('')
    try {
      const res = await apiFetch('/api/lesson-plans/suggest-times', {
        method: 'POST',
        body: JSON.stringify({
          blocks: blocks.map((b) => ({ type: b.type, activity: b.activity })),
          total_minutes: durationMinutes,
          grade_level: gradeLevel,
        }),
      }, { preferTeacher: true })
      if (!res.ok) throw new Error('生成失敗')
      const data = (await res.json()) as { times?: number[] }
      const times = data.times ?? []
      if (times.length === blocks.length) {
        setBlocks((prev) => prev.map((b, i) => ({ ...b, durationMinutes: Math.max(1, times[i] ?? 5) })))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '建議時間失敗')
    } finally {
      setGeneratingTimes(false)
    }
  }

  async function generateProps() {
    if (!sourceText.trim()) { setError('請先輸入課文'); return }
    setGeneratingProps(true)
    setError('')
    try {
      const res = await apiFetch('/api/lesson-plans/generate-props', {
        method: 'POST',
        body: JSON.stringify({
          source_text: sourceText,
          blocks: blocks.map((b) => ({ type: b.type, activity: b.activity })),
          grade_level: gradeLevel,
        }),
      }, { preferTeacher: true })
      if (!res.ok) throw new Error('生成失敗')
      const data = (await res.json()) as { props?: string[] }
      setPropsList(data.props ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成教具清單失敗')
    } finally {
      setGeneratingProps(false)
    }
  }

  async function generateBoard() {
    if (!sourceText.trim()) { setError('請先輸入課文'); return }
    setGeneratingBoard(true)
    setError('')
    try {
      const res = await apiFetch('/api/lesson-plans/generate-board', {
        method: 'POST',
        body: JSON.stringify({
          source_text: sourceText,
          blocks: blocks.map((b) => ({ type: b.type, activity: b.activity })),
          grade_level: gradeLevel,
        }),
      }, { preferTeacher: true })
      if (!res.ok) throw new Error('生成失敗')
      const data = (await res.json()) as { board?: string }
      setBoardLayout(data.board ?? '')
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成板書失敗')
    } finally {
      setGeneratingBoard(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const ext = file.name.toLowerCase().split('.').pop()
    if (ext === 'docx' || ext === 'doc') {
      setParsingDoc(true)
      setError('')
      try {
        const arr = await file.arrayBuffer()
        const { value } = await mammoth.extractRawText({ arrayBuffer: arr })
        setSourceText(value || '')
        setIsDirty(true)
        const parseRes = await apiFetch('/api/lesson-plans/parse-document', {
          method: 'POST',
          body: JSON.stringify({ text: value || '' }),
        }, { preferTeacher: true })
        if (parseRes.ok) {
          const parsed = (await parseRes.json()) as { learning_objectives?: string[]; key_vocabulary?: string[]; core_values?: string; core_concept?: string; core_question?: string }
          setParsedDoc(parsed)
          if (parsed.core_concept) setCoreConcept(parsed.core_concept)
          if (parsed.core_question) setCoreQuestion(parsed.core_question)
        } else {
          setParsedDoc(null)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '檔案讀取失敗')
        setParsedDoc(null)
      } finally {
        setParsingDoc(false)
      }
    } else {
      setError('僅支援 .docx 檔案')
    }
  }

  async function generateClimax() {
    if (!sourceText.trim()) { setError('請先輸入課文'); return }
    setGeneratingClimax(true)
    setError('')
    try {
      const res = await apiFetch('/api/lesson-plans/generate-climax', {
        method: 'POST',
        body: JSON.stringify({
          source_text: sourceText,
          grade_level: gradeLevel,
          core_values: parsedDoc?.core_values,
        }),
      }, { preferTeacher: true })
      if (!res.ok) throw new Error('生成失敗')
      const data = (await res.json()) as { climax?: string }
      setClimax(data.climax ?? '')
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失敗')
    } finally {
      setGeneratingClimax(false)
    }
  }

  async function generateHomeworkList() {
    if (!sourceText.trim()) { setError('請先輸入課文'); return }
    setGeneratingHomework(true)
    setError('')
    try {
      const res = await apiFetch('/api/lesson-plans/generate-homework', {
        method: 'POST',
        body: JSON.stringify({
          source_text: sourceText,
          blocks: blocks.map((b) => ({ type: b.type, activity: b.activity })),
          grade_level: gradeLevel,
        }),
      }, { preferTeacher: true })
      if (!res.ok) throw new Error('生成失敗')
      const data = (await res.json()) as { homework?: string[] }
      setHomework(data.homework ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失敗')
    } finally {
      setGeneratingHomework(false)
    }
  }

  async function generateKeyQuestionsList() {
    if (!sourceText.trim()) { setError('請先輸入課文'); return }
    setGeneratingKeyQuestions(true)
    setError('')
    try {
      const res = await apiFetch('/api/lesson-plans/generate-key-questions', {
        method: 'POST',
        body: JSON.stringify({
          source_text: sourceText,
          blocks: blocks.map((b) => ({ type: b.type, activity: b.activity })),
          grade_level: gradeLevel,
          core_question: coreQuestion.trim() || undefined,
        }),
      }, { preferTeacher: true })
      if (!res.ok) throw new Error('生成失敗')
      const data = (await res.json()) as { key_questions?: string[] }
      setKeyQuestions(data.key_questions ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失敗')
    } finally {
      setGeneratingKeyQuestions(false)
    }
  }

  async function generateAssessmentContent() {
    if (!sourceText.trim()) { setError('請先輸入課文'); return }
    setGeneratingAssessment(true)
    setError('')
    try {
      const res = await apiFetch('/api/lesson-plans/generate-assessment', {
        method: 'POST',
        body: JSON.stringify({
          source_text: sourceText,
          blocks: blocks.map((b) => ({ type: b.type, activity: b.activity })),
          grade_level: gradeLevel,
          learning_objectives: parsedDoc?.learning_objectives,
        }),
      }, { preferTeacher: true })
      if (!res.ok) throw new Error('生成失敗')
      const data = (await res.json()) as { assessment_design?: string }
      setAssessmentDesign(data.assessment_design ?? '')
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失敗')
    } finally {
      setGeneratingAssessment(false)
    }
  }

  function exportPdf() {
    const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${(title || '教案').replace(/</g, '&lt;')}</title>
<style>body{font-family:system-ui,sans-serif;padding:24px;max-width:600px;margin:0 auto;line-height:1.6}
h1{font-size:1.5em;margin-bottom:0.5em}
.meta{color:#666;font-size:0.9em;margin-bottom:1.5em}
.exam-header{display:flex;justify-content:space-between;margin-bottom:1em;font-size:0.9em}
.exam-header span{border-bottom:1px solid #333;padding:0 1em;min-width:4em}
section{margin:1.5em 0}
section h2{font-size:1.1em;margin-bottom:0.5em;border-bottom:1px solid #ddd;padding-bottom:0.25em}
ul{margin:0.3em 0;padding-left:1.5em}
.script-line{margin:0.25em 0;font-size:0.9em}
@media print{body{padding:16px}}</style></head><body>
<h1>${(title || '教案').replace(/</g, '&lt;')}</h1>
${textbookRef ? `<p class="meta">教科書：${textbookRef.replace(/</g, '&lt;')}</p>` : ''}
<p class="meta">年級：小${gradeLevel} │ 時長：${durationMinutes} 分鐘</p>
<div class="exam-header">
  <span>學校：____________</span><span>班級：____________</span><span>姓名：____________</span><span>座號：______</span><span>日期：____________</span><span>得分：______</span>
</div>

${coreConcept || coreQuestion ? `<section><h2>核心概念與問題</h2>
${coreConcept ? `<p><strong>核心概念：</strong>${coreConcept.replace(/</g, '&lt;')}</p>` : ''}
${coreQuestion ? `<p><strong>核心問題：</strong>${coreQuestion.replace(/</g, '&lt;')}</p>` : ''}
</section>` : ''}

<section><h2>課文摘要</h2><p>${(sourceText.slice(0, 800) + (sourceText.length > 800 ? '…' : '')).replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p></section>

<section><h2>教學環節${planMode === 'brief' ? '（簡案）' : ''}</h2>
${blocks.map((b, i) => planMode === 'brief'
  ? `<div style="margin:1em 0"><strong>${i + 1}. ${b.type}－${b.activity}（${b.durationMinutes} 分）</strong></div>`
  : `
<div style="margin:1em 0">
  <strong>${i + 1}. ${b.type}－${b.activity}（${b.durationMinutes} 分）</strong>
  ${b.script.slice(0, 5).map((s) => `<div class="script-line">${s.role === 'teacher' ? '師' : '生'}：${s.content.replace(/</g, '&lt;')}</div>`).join('')}
  ${b.script.length > 5 ? `<div class="script-line">…共 ${b.script.length} 則</div>` : ''}
</div>`).join('')}
</section>

${keyQuestions.length > 0 ? `<section><h2>關鍵提問</h2><ol>${keyQuestions.map((q) => `<li>${q.replace(/</g, '&lt;')}</li>`).join('')}</ol></section>` : ''}

${assessmentDesign ? `<section><h2>評量設計</h2><p>${assessmentDesign.replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p></section>` : ''}

${propsList.length > 0 ? `<section><h2>教具清單</h2><ul>${propsList.map((p) => `<li>${p.replace(/</g, '&lt;')}</li>`).join('')}</ul></section>` : ''}

${boardLayout ? `<section><h2>板書</h2><pre style="white-space:pre-wrap;font-size:0.9em">${boardLayout.slice(0, 800).replace(/</g, '&lt;')}</pre></section>` : ''}

${climax ? `<section><h2>價值觀昇華結語</h2><p>${climax.replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p></section>` : ''}

${homework.length > 0 ? `<section><h2>作業與延伸</h2><ul>${homework.map((h) => `<li>${h.replace(/</g, '&lt;')}</li>`).join('')}</ul></section>` : ''}
</body></html>`
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank', 'noopener')
    if (win) {
      win.onload = () => {
        win.print()
        win.onafterprint = () => URL.revokeObjectURL(url)
      }
    } else {
      const a = document.createElement('a')
      a.href = url
      a.download = `${title || '教案'}.html`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-semibold text-amber-900 mb-6">教案設計</h1>

      {!dismissedHint && blocks.length === 0 && !sourceText.trim() && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between gap-2">
          <p className="text-sm text-amber-800">第一次使用？選策略模板或貼上課文快速開始</p>
          <button type="button" onClick={() => setDismissedHint(true)} className="text-amber-600 hover:text-amber-800 shrink-0">✕</button>
        </div>
      )}

      <div className="lg:hidden flex gap-2 mb-4">
        {(['basic', 'blocks', 'assist'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTabPanel(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tabPanel === t ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}
          >
            {t === 'basic' ? '基本設定' : t === 'blocks' ? '教學環節' : '輔助'}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,1.5fr,1fr]">
        <div className={`space-y-4 ${tabPanel !== 'basic' ? 'hidden lg:block' : ''}`}>
          <div className="bg-white rounded-xl border border-amber-100 p-4 space-y-3">
            <h2 className="font-medium text-amber-900">基本設定</h2>
            <div>
              <label className="block text-sm text-amber-800 mb-1">教案標題</label>
              <input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setIsDirty(true) }}
                placeholder="例如：耳朵上的綠星星"
                className="w-full py-2 px-3 rounded-lg border-2 border-amber-200"
              />
            </div>
            {!loading && lessonTexts.length > 0 && (
              <div>
                <label className="block text-sm text-amber-800 mb-1">從課文庫選取</label>
                <select
                  className="w-full py-2 px-3 rounded-lg border-2 border-amber-200"
                  value=""
                  onChange={(e) => {
                    const item = lessonTexts.find((l) => l.id === e.target.value)
                    if (item) {
                      setSourceText(item.source_text)
                      setTitle(item.title)
                      setTextbookRef(item.textbook_ref ?? '')
                      setParsedDoc({
                        learning_objectives: item.learning_objectives ? item.learning_objectives.split(/\n|、/).filter(Boolean) : undefined,
                        key_vocabulary: item.key_vocabulary ? item.key_vocabulary.split(/[,、]/).map((s) => s.trim()).filter(Boolean) : undefined,
                      })
                      setIsDirty(true)
                      e.target.value = ''
                    }
                  }}
                >
                  <option value="">— 選擇 —</option>
                  {lessonTexts.map((l) => (
                    <option key={l.id} value={l.id}>{l.title}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm text-amber-800">課文／故事</label>
                <div className="flex gap-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx,.doc"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={parsingDoc}
                    className="text-xs text-amber-600 underline disabled:opacity-50"
                  >
                    {parsingDoc ? '解析中…' : '上傳 .docx'}
                  </button>
                  {sourceText.trim() && (
                    <button
                      type="button"
                      disabled={savingToTexts}
                      onClick={async () => {
                        if (!title.trim()) { toast.error('請先輸入教案標題'); return }
                        setSavingToTexts(true)
                        try {
                          const res = await apiFetch('/api/lesson-texts', {
                            method: 'POST',
                            body: JSON.stringify({
                              title: title.trim(),
                              source_text: sourceText,
                              learning_objectives: parsedDoc?.learning_objectives?.join('\n') || undefined,
                              key_vocabulary: parsedDoc?.key_vocabulary?.join('、') || undefined,
                              textbook_ref: textbookRef.trim() || undefined,
                            }),
                          }, { preferTeacher: true })
                          if (!res.ok) throw new Error('儲存失敗')
                          await res.json()
                          toast.success('已儲存到課文庫')
                          const refresh = await apiFetch('/api/lesson-texts', undefined, { preferTeacher: true })
                          if (refresh.ok) {
                            const data = await refresh.json() as { items?: LessonTextItem[] }
                            setLessonTexts(data.items ?? [])
                          }
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : '儲存失敗')
                        } finally {
                          setSavingToTexts(false)
                        }
                      }}
                      className="text-xs text-amber-600 underline disabled:opacity-50"
                    >
                      {savingToTexts ? '儲存中…' : '儲存到課文庫'}
                    </button>
                  )}
                </div>
              </div>
              <textarea
                value={sourceText}
                onChange={(e) => { setSourceText(e.target.value); setIsDirty(true) }}
                placeholder="貼上課文或故事內容，或上傳 Word 檔案…"
                rows={4}
                className="w-full py-2 px-3 rounded-lg border-2 border-amber-200"
              />
            </div>
            {parsedDoc && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-amber-900">解析結果</p>
                  {(parsedDoc.core_concept || parsedDoc.core_question) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (parsedDoc?.core_concept) setCoreConcept(parsedDoc.core_concept)
                        if (parsedDoc?.core_question) setCoreQuestion(parsedDoc.core_question)
                        toast.success('已套用核心概念與問題')
                      }}
                      className="text-xs text-amber-600 underline hover:text-amber-800"
                    >
                      套用到教案
                    </button>
                  )}
                </div>
                {parsedDoc.learning_objectives?.length ? (
                  <p><span className="text-amber-700">教學目標：</span>{parsedDoc.learning_objectives.join('、')}</p>
                ) : null}
                {parsedDoc.key_vocabulary?.length ? (
                  <p><span className="text-amber-700">重點詞彙：</span>{parsedDoc.key_vocabulary.join('、')}</p>
                ) : null}
                {parsedDoc.core_values ? (
                  <p><span className="text-amber-700">核心價值：</span>{parsedDoc.core_values}</p>
                ) : null}
                {parsedDoc.core_concept ? (
                  <p><span className="text-amber-700">核心概念：</span>{parsedDoc.core_concept}</p>
                ) : null}
                {parsedDoc.core_question ? (
                  <p><span className="text-amber-700">核心問題：</span>{parsedDoc.core_question}</p>
                ) : null}
              </div>
            )}
            <div>
              <label className="block text-sm text-amber-800 mb-1">核心概念（選填）</label>
              <input
                type="text"
                value={coreConcept}
                onChange={(e) => { setCoreConcept(e.target.value); setIsDirty(true) }}
                placeholder="本課要讓學生掌握的核心概念"
                className="w-full py-2 px-3 rounded-lg border-2 border-amber-200"
              />
            </div>
            <div>
              <label className="block text-sm text-amber-800 mb-1">核心問題（選填）</label>
              <input
                type="text"
                value={coreQuestion}
                onChange={(e) => { setCoreQuestion(e.target.value); setIsDirty(true) }}
                placeholder="引導學生思考的關鍵提問"
                className="w-full py-2 px-3 rounded-lg border-2 border-amber-200"
              />
            </div>
            <div>
              <label className="block text-sm text-amber-800 mb-1">教案模式</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="planMode"
                    checked={planMode === 'detailed'}
                    onChange={() => { setPlanMode('detailed'); setIsDirty(true) }}
                  />
                  <span>詳案</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="planMode"
                    checked={planMode === 'brief'}
                    onChange={() => { setPlanMode('brief'); setIsDirty(true) }}
                  />
                  <span>簡案</span>
                </label>
              </div>
              <p className="text-xs text-amber-600 mt-1">詳案含完整腳本；簡案為主要流程摘要</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm text-amber-800 mb-1">年級</label>
                <select
                  value={gradeLevel}
                  onChange={(e) => { setGradeLevel(Number(e.target.value)); setIsDirty(true) }}
                  className="w-full py-2 px-3 rounded-lg border-2 border-amber-200"
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>小{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-amber-800 mb-1">總時長（分）</label>
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => { setDurationMinutes(Number(e.target.value) || 40); setIsDirty(true) }}
                  min={10}
                  max={120}
                  className="w-full py-2 px-3 rounded-lg border-2 border-amber-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-amber-800 mb-1">教科書對照（選填）</label>
              <input
                type="text"
                value={textbookRef}
                onChange={(e) => { setTextbookRef(e.target.value); setIsDirty(true) }}
                placeholder="例如：三上第五課、單元三"
                className="w-full py-2 px-3 rounded-lg border-2 border-amber-200"
              />
            </div>

            {savedPlans.length > 0 && (
              <div>
                <label className="block text-sm text-amber-800 mb-1">開啟已儲存教案</label>
                <select
                  className="w-full py-2 px-3 rounded-lg border-2 border-amber-200"
                  value=""
                  onChange={(e) => {
                    const id = e.target.value
                    if (id) {
                      loadPlan(id)
                      e.target.value = ''
                    }
                  }}
                >
                  <option value="">— 選擇 —</option>
                  {savedPlans.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm text-amber-800 mb-1">學情設定</label>
              <div className="flex flex-wrap gap-2">
                {STUDENT_PROFILE_OPTIONS.map((o) => (
                  <label key={o.id} className="flex items-center gap-1 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={studentProfile.includes(o.id)}
                      onChange={() => toggleProfile(o.id)}
                    />
                    <span>{o.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-amber-800 mb-1">教學策略模板</label>
              <select
                value={strategyType}
                onChange={(e) => applyStrategyTemplate(e.target.value)}
                className="w-full py-2 px-3 rounded-lg border-2 border-amber-200"
              >
                <option value="">— 空白開始 —</option>
                <option value="story_retell">複述故事三步走（圖片排序→關鍵詞→連接詞）</option>
              </select>
            </div>
          </div>
        </div>

        <div className={`space-y-4 ${tabPanel !== 'blocks' ? 'hidden lg:block' : ''}`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-medium text-amber-900">教學環節</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-amber-600">預計 {totalMinutes} 分鐘</span>
              <button
                type="button"
                onClick={suggestTimes}
                disabled={generatingTimes || blocks.length === 0}
                className="px-2 py-1 rounded border border-amber-300 text-amber-700 text-xs hover:bg-amber-50 disabled:opacity-50"
              >
                {generatingTimes ? '建議中…' : 'AI 建議時間'}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-red-600 text-sm">{error}</p>
              <button type="button" onClick={() => setError('')} className="text-sm text-amber-700 underline">
                關閉
              </button>
            </div>
          )}

          <div className="space-y-3">
            {blocks.map((block, i) => (
              <div key={block.id} className="bg-white rounded-xl border-2 border-amber-100 p-4">
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() => toggleBlockCollapse(block.id)}
                    className="text-amber-600 hover:text-amber-800 mr-1 shrink-0"
                    title={blockCollapsed[block.id] ? '展開' : '摺疊'}
                  >
                    {blockCollapsed[block.id] ? '▶' : '▼'}
                  </button>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-amber-900">{i + 1}.</span>
                    <select
                      value={block.type}
                      onChange={(e) => {
                        const t = e.target.value as BlockType
                        const opts = ACTIVITY_OPTIONS[t]
                        updateBlock(block.id, { type: t, activity: opts?.[0] ?? block.activity })
                      }}
                      className="py-1 px-2 rounded border border-amber-200 text-sm"
                    >
                      {BLOCK_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <select
                      value={block.activity}
                      onChange={(e) => updateBlock(block.id, { activity: e.target.value })}
                      className="py-1 px-2 rounded border border-amber-200 text-sm"
                    >
                      {(ACTIVITY_OPTIONS[block.type] ?? []).map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={block.durationMinutes}
                      onChange={(e) => updateBlock(block.id, { durationMinutes: Number(e.target.value) || 5 })}
                      min={1}
                      max={30}
                      className="w-14 py-1 px-2 rounded border border-amber-200 text-sm"
                      title="分鐘"
                    />
                    <span className="text-amber-600 text-sm">分</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => generateScript(i)}
                      disabled={generatingIndex !== null || !sourceText.trim()}
                      className="px-2 py-1 rounded bg-amber-500 text-white text-xs disabled:opacity-50"
                    >
                      {generatingIndex === i ? '生成中…' : 'AI 生成腳本'}
                    </button>
                    <button type="button" onClick={() => moveBlock(block.id, 'up')} disabled={i === 0} className="p-1 text-amber-600 disabled:opacity-30">↑</button>
                    <button type="button" onClick={() => moveBlock(block.id, 'down')} disabled={i === blocks.length - 1} className="p-1 text-amber-600 disabled:opacity-30">↓</button>
                    <button type="button" onClick={() => removeBlock(block.id)} className="p-1 text-red-600">✕</button>
                  </div>
                </div>
                {!blockCollapsed[block.id] && (block.script.length > 0 ? (
                  <div className="mt-2 space-y-1.5 text-sm">
                    {block.script.map((line, j) => (
                      <div key={j} className="flex gap-2">
                        <span className={`font-medium shrink-0 ${line.role === 'teacher' ? 'text-amber-700' : 'text-green-700'}`}>
                          {line.role === 'teacher' ? '師' : '生'}：
                        </span>
                        <div>
                          <span>{line.content}</span>
                          {line.action && (
                            <span className="block text-amber-600 text-xs italic">*{line.action}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-amber-500 text-sm mt-2">尚未生成腳本，點「AI 生成腳本」</p>
                ))}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {BLOCK_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => addBlock(t)}
                className="px-4 py-2 rounded-lg border-2 border-dashed border-amber-300 text-amber-700 text-sm hover:bg-amber-50"
              >
                + {t}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="flex-1 min-h-[44px] px-6 py-3 rounded-xl bg-amber-500 text-white font-medium disabled:opacity-50"
            >
              {saving ? '儲存中…' : '儲存教案'}
            </button>
            <button
              type="button"
              onClick={exportPdf}
              className="min-h-[44px] px-4 py-3 rounded-xl border-2 border-amber-300 text-amber-800 font-medium hover:bg-amber-50"
            >
              列印／匯出
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await exportPptFromLessonPlan({
                    title: title || '教案',
                    sourceText,
                    gradeLevel,
                    durationMinutes,
                    textbookRef: textbookRef || undefined,
                    coreConcept: coreConcept || undefined,
                    coreQuestion: coreQuestion || undefined,
                    blocks: blocks.map((b) => ({ type: b.type, activity: b.activity, script: b.script, durationMinutes: b.durationMinutes })),
                    keyQuestions: keyQuestions,
                    propsList: propsList,
                    boardLayout: boardLayout,
                    climax: climax,
                    homework: homework,
                    assessmentDesign: assessmentDesign,
                    learningObjectives: parsedDoc?.learning_objectives,
                    keyVocabulary: parsedDoc?.key_vocabulary,
                    planMode: planMode,
                  })
                  toast.success('PPT 已下載')
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'PPT 匯出失敗')
                }
              }}
              className="min-h-[44px] px-4 py-3 rounded-xl border-2 border-amber-300 text-amber-800 font-medium hover:bg-amber-50"
            >
              匯出 PPT
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await exportPptPoc()
                  toast.success('PPT 測試檔已下載')
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'PPT 匯出失敗')
                }
              }}
              className="min-h-[44px] px-3 py-2 rounded-lg border border-amber-200 text-amber-700 text-sm hover:bg-amber-50"
              title="PoC：固定範例資料"
            >
              PPT 測試
            </button>
            {sourceText.trim() && (
              <button
                type="button"
                onClick={() => navigate('/teacher/generate', { state: { fromLessonPlan: true, sourceText, learningObjectives: parsedDoc?.learning_objectives?.join('\n'), keyVocabulary: parsedDoc?.key_vocabulary?.join('、'), textbookRef } })}
                className="min-h-[44px] px-4 py-3 rounded-xl border-2 border-amber-300 text-amber-800 font-medium hover:bg-amber-50"
              >
                帶到 AI 出題
              </button>
            )}
          </div>
        </div>

        <div className={`space-y-4 ${tabPanel !== 'assist' ? 'hidden lg:block' : ''}`}>
          <div className="bg-white rounded-xl border border-amber-100 p-4">
            <button type="button" onClick={() => toggleRightSection('keyQuestions')} className="w-full flex items-center justify-between">
              <h2 className="font-medium text-amber-900">關鍵提問</h2>
              <span className="text-amber-600">{rightPanelOpen.keyQuestions ? '▼' : '▶'}</span>
            </button>
            {rightPanelOpen.keyQuestions && (
              <>
                <button
                  type="button"
                  onClick={generateKeyQuestionsList}
                  disabled={generatingKeyQuestions || !sourceText.trim()}
                  className="mt-2 mb-2 px-3 py-1 rounded border border-amber-300 text-amber-700 text-sm hover:bg-amber-50 disabled:opacity-50"
                >
                  {generatingKeyQuestions ? '生成中…' : 'AI 生成'}
                </button>
                {keyQuestions.length > 0 ? (
                  <div className="space-y-2">
                    {keyQuestions.map((q, i) => (
                      <div key={i} className="flex gap-1 items-start">
                        <span className="text-amber-700 text-sm shrink-0">{i + 1}.</span>
                        <input
                          type="text"
                          value={q}
                          onChange={(e) => updateKeyQuestion(i, e.target.value)}
                          className="flex-1 py-1 px-2 rounded border border-amber-200 text-sm"
                        />
                        <button type="button" onClick={() => removeKeyQuestion(i)} className="p-1 text-red-600 text-xs">✕</button>
                      </div>
                    ))}
                    <button type="button" onClick={addKeyQuestion} className="text-xs text-amber-600 underline">+ 新增</button>
                  </div>
                ) : (
                  <p className="text-amber-500 text-sm">引導思考的提問（可參考 WHERETO 精神）</p>
                )}
              </>
            )}
          </div>
          <div className="bg-white rounded-xl border border-amber-100 p-4">
            <button type="button" onClick={() => toggleRightSection('assessment')} className="w-full flex items-center justify-between">
              <h2 className="font-medium text-amber-900">評量設計</h2>
              <span className="text-amber-600">{rightPanelOpen.assessment ? '▼' : '▶'}</span>
            </button>
            {rightPanelOpen.assessment && (
              <>
                <button
                  type="button"
                  onClick={generateAssessmentContent}
                  disabled={generatingAssessment || !sourceText.trim()}
                  className="mt-2 mb-2 px-3 py-1 rounded border border-amber-300 text-amber-700 text-sm hover:bg-amber-50 disabled:opacity-50"
                >
                  {generatingAssessment ? '生成中…' : 'AI 生成'}
                </button>
                {assessmentDesign ? (
                  <p className="text-sm text-amber-800 whitespace-pre-wrap">{assessmentDesign}</p>
                ) : (
                  <p className="text-amber-500 text-sm">形成性與總結性評量方式</p>
                )}
              </>
            )}
          </div>
          <div className="bg-white rounded-xl border border-amber-100 p-4">
            <button type="button" onClick={() => toggleRightSection('climax')} className="w-full flex items-center justify-between">
              <h2 className="font-medium text-amber-900">價值觀昇華結語</h2>
              <span className="text-amber-600">{rightPanelOpen.climax ? '▼' : '▶'}</span>
            </button>
            {rightPanelOpen.climax && (
              <>
                <button
                  type="button"
                  onClick={generateClimax}
                  disabled={generatingClimax || !sourceText.trim()}
                  className="mt-2 mb-2 px-3 py-1 rounded border border-amber-300 text-amber-700 text-sm hover:bg-amber-50 disabled:opacity-50"
                >
                  {generatingClimax ? '生成中…' : 'AI 生成'}
                </button>
                {climax ? (
                  <p className="text-sm text-amber-800 whitespace-pre-wrap">{climax}</p>
                ) : (
                  <p className="text-amber-500 text-sm">課堂總結時的教師結語腳本</p>
                )}
              </>
            )}
          </div>
          <div className="bg-white rounded-xl border border-amber-100 p-4">
            <button type="button" onClick={() => toggleRightSection('homework')} className="w-full flex items-center justify-between">
              <h2 className="font-medium text-amber-900">作業與延伸</h2>
              <span className="text-amber-600">{rightPanelOpen.homework ? '▼' : '▶'}</span>
            </button>
            {rightPanelOpen.homework && (
              <>
                <button
                  type="button"
                  onClick={generateHomeworkList}
                  disabled={generatingHomework || !sourceText.trim()}
                  className="mt-2 mb-2 px-3 py-1 rounded border border-amber-300 text-amber-700 text-sm hover:bg-amber-50 disabled:opacity-50"
                >
                  {generatingHomework ? '生成中…' : 'AI 生成'}
                </button>
                {homework.length > 0 ? (
                  <div className="space-y-2">
                    {homework.map((h, i) => (
                      <div key={i} className="flex gap-1 items-start">
                        <input
                          type="text"
                          value={h}
                          onChange={(e) => updateHomework(i, e.target.value)}
                          className="flex-1 py-1 px-2 rounded border border-amber-200 text-sm"
                        />
                        <button type="button" onClick={() => removeHomework(i)} className="p-1 text-red-600 text-xs">✕</button>
                      </div>
                    ))}
                    <button type="button" onClick={addHomework} className="text-xs text-amber-600 underline">+ 新增</button>
                  </div>
                ) : (
                  <p className="text-amber-500 text-sm">課後任務（如：把故事講給父母聽）</p>
                )}
              </>
            )}
          </div>
          <div className="bg-white rounded-xl border border-amber-100 p-4">
            <button type="button" onClick={() => toggleRightSection('props')} className="w-full flex items-center justify-between">
              <h2 className="font-medium text-amber-900">教具清單</h2>
              <span className="text-amber-600">{rightPanelOpen.props ? '▼' : '▶'}</span>
            </button>
            {rightPanelOpen.props && (
              <>
                <button
                  type="button"
                  onClick={generateProps}
                  disabled={generatingProps || !sourceText.trim()}
                  className="mt-2 mb-2 px-3 py-1 rounded border border-amber-300 text-amber-700 text-sm hover:bg-amber-50 disabled:opacity-50"
                >
                  {generatingProps ? '生成中…' : 'AI 生成'}
                </button>
                {propsList.length > 0 ? (
                  <ul className="list-disc list-inside text-sm text-amber-800 space-y-1">
                    {propsList.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-amber-500 text-sm">點「AI 生成」依課文與環節產生</p>
                )}
              </>
            )}
          </div>
          <div className="bg-white rounded-xl border border-amber-100 p-4">
            <button type="button" onClick={() => toggleRightSection('board')} className="w-full flex items-center justify-between">
              <h2 className="font-medium text-amber-900">板書預覽</h2>
              <span className="text-amber-600">{rightPanelOpen.board ? '▼' : '▶'}</span>
            </button>
            {rightPanelOpen.board && (
              <>
                <button
                  type="button"
                  onClick={generateBoard}
                  disabled={generatingBoard || !sourceText.trim()}
                  className="mt-2 mb-2 px-3 py-1 rounded border border-amber-300 text-amber-700 text-sm hover:bg-amber-50 disabled:opacity-50"
                >
                  {generatingBoard ? '生成中…' : 'AI 生成'}
                </button>
                {boardLayout ? (
                  <pre className="text-sm text-amber-800 whitespace-pre-wrap font-sans bg-amber-50 p-3 rounded-lg max-h-48 overflow-y-auto">
                    {boardLayout}
                  </pre>
                ) : (
                  <p className="text-amber-500 text-sm">點「AI 生成」依流程產生板書結構</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
