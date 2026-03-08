/**
 * 教師端：題目預覽與編輯（發佈前可修改、刪除、排序）
 */
import { useState } from 'react'
import ReorderQuestion from '../questions/ReorderQuestion'
import MatchingQuestion from '../questions/MatchingQuestion'

export type Question =
  | { type: 'multiple_choice' | 'choice'; question?: string; options?: string[]; correct?: number }
  | { type: 'fill_blank' | 'fill'; question?: string; correct?: string; hint?: string; display_type?: string }
  | { type: 'true_false' | 'judge'; question?: string; correct?: boolean; explanation?: string }
  | { type: 'reorder' | 'order'; sentences?: string[]; correct_order?: number[]; question?: string; options?: string[] }
  | { type: 'matching' | 'match'; question?: string; left?: string[]; right?: string[]; correct_pairs?: number[][] }
  | { type: 'short_answer'; question?: string; reference_answer?: string; scoring_guide?: string }

type DictationWord = { word: string; pinyin?: string; hint?: string }

const QUESTION_TYPE_LABELS: Record<string, string> = {
  multiple_choice: '選擇題',
  choice: '選擇題',
  fill_blank: '填空題',
  fill: '填空題',
  true_false: '判斷題',
  judge: '判斷題',
  reorder: '排序題',
  order: '排序題',
  matching: '配對題',
  match: '配對題',
  short_answer: '簡答題',
}

function getTypeLabel(q: Question): string {
  const d = q as Question & { display_type?: string }
  if (d.display_type?.trim()) return d.display_type.trim()
  return QUESTION_TYPE_LABELS[q.type ?? ''] ?? ''
}

/** 取得預覽用的初始值（顯示正確答案狀態） */
function getPreviewValue(q: Question): unknown {
  const t = q.type ?? ''
  if (t === 'multiple_choice' || t === 'choice') return (q as Question & { correct?: number }).correct ?? 0
  if (t === 'reorder' || t === 'order') {
    const r = q as Question & { sentences?: string[]; correct_order?: number[]; options?: string[] }
    const items = r.sentences ?? r.options ?? []
    const order = r.correct_order ?? items.map((_: string, i: number) => i)
    return order
  }
  if (t === 'matching' || t === 'match') {
    const m = q as Question & { left?: string[]; right?: string[]; correct_pairs?: number[][] }
    const left = m.left ?? []
    const pairs = m.correct_pairs ?? left.map((_: string, i: number) => [i, i] as [number, number])
    return pairs
  }
  if (t === 'fill_blank' || t === 'fill' || t === 'short_answer') return (q as Question & { correct?: string; reference_answer?: string }).correct ?? (q as Question & { reference_answer?: string }).reference_answer ?? ''
  return undefined
}

function PreviewBlock({
  index,
  question,
  onDelete,
  onMoveUp,
  onMoveDown,
  onEdit,
  canMoveUp,
  canMoveDown,
}: {
  index: number
  question: Question
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onEdit: (q: Question) => void
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  const [editingJson, setEditingJson] = useState(false)
  const [jsonText, setJsonText] = useState('')
  const [jsonError, setJsonError] = useState('')
  const type = question.type ?? ''
  const typeLabel = getTypeLabel(question)
  const previewValue = getPreviewValue(question)

  function startEdit() {
    setJsonText(JSON.stringify(question, null, 2))
    setEditingJson(true)
    setJsonError('')
  }

  function saveEdit() {
    setJsonError('')
    try {
      const parsed = JSON.parse(jsonText) as Question
      onEdit(parsed)
      setEditingJson(false)
    } catch {
      setJsonError('JSON 格式錯誤，請檢查括號與逗號')
    }
  }

  if (editingJson) {
    return (
      <div className="rounded-xl border-2 border-amber-300 bg-amber-50/50 p-4">
        <textarea
          value={jsonText}
          onChange={(e) => { setJsonText(e.target.value); setJsonError('') }}
          rows={12}
          className="w-full text-sm font-mono p-2 rounded-lg border border-amber-200"
          aria-invalid={!!jsonError}
          aria-describedby={jsonError ? 'json-error' : undefined}
        />
        {jsonError && (
          <p id="json-error" className="mt-2 text-sm text-red-600" role="alert">{jsonError}</p>
        )}
        <div className="flex gap-2 mt-2">
          <button type="button" onClick={saveEdit} className="px-3 py-1 rounded-lg bg-amber-500 text-white text-sm">
            儲存
          </button>
          <button type="button" onClick={() => { setEditingJson(false); setJsonError('') }} className="px-3 py-1 rounded-lg border border-amber-200 text-amber-800 text-sm">
            取消
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border-2 border-amber-100 bg-white p-4 group">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <p className="font-medium text-amber-900">第 {index + 1} 題</p>
          {typeLabel && (
            <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-amber-100 text-amber-800">
              {typeLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
          <button type="button" onClick={startEdit} className="p-1 text-amber-600 hover:text-amber-800 text-xs" title="編輯">
            編輯
          </button>
          <button type="button" onClick={onMoveUp} disabled={!canMoveUp} className="p-1 text-amber-600 hover:text-amber-800 disabled:opacity-30 text-xs" title="上移">
            ↑
          </button>
          <button type="button" onClick={onMoveDown} disabled={!canMoveDown} className="p-1 text-amber-600 hover:text-amber-800 disabled:opacity-30 text-xs" title="下移">
            ↓
          </button>
          <button type="button" onClick={onDelete} className="p-1 text-red-600 hover:text-red-800 text-xs" title="刪除">
            刪除
          </button>
        </div>
      </div>

      {(type === 'multiple_choice' || type === 'choice') && (
        <>
          <p className="text-amber-800 mb-3">{(question as Question & { question?: string }).question}</p>
          <div className="space-y-2">
            {((question as Question & { options?: string[] }).options ?? []).map((opt, j) => (
              <div key={j} className="flex items-center gap-2 min-h-[36px]">
                <span className="text-amber-500 w-5">{j === (question as Question & { correct?: number }).correct ? '✓' : '○'}</span>
                <span>{opt}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {(type === 'fill_blank' || type === 'fill') && (
        <>
          <p className="text-amber-800 mb-3">{(question as Question & { question?: string }).question}</p>
          {(question as Question & { display_type?: string }).display_type === '填標點符號' ? (
            <p className="text-amber-600 text-sm">答案：{(question as Question & { correct?: string }).correct ?? '—'}</p>
          ) : (
            <p className="text-amber-600 text-sm">答案：{(question as Question & { correct?: string }).correct ?? '—'}</p>
          )}
        </>
      )}
      {(type === 'true_false' || type === 'judge') && (
        <>
          <p className="text-amber-800 mb-3">{(question as Question & { question?: string }).question}</p>
          <p className="text-amber-600 text-sm">答案：{(question as Question & { correct?: boolean }).correct ? '對' : '錯'}</p>
        </>
      )}
      {(type === 'reorder' || type === 'order') && (
        <ReorderQuestion
          question={question as Question & { sentences?: string[]; correct_order?: number[] }}
          value={previewValue}
          onChange={() => {}}
        />
      )}
      {(type === 'matching' || type === 'match') && (
        <MatchingQuestion
          question={question as Question & { left?: string[]; right?: string[] }}
          value={previewValue}
          onChange={() => {}}
        />
      )}
      {type === 'short_answer' && (
        <>
          <p className="text-amber-800 mb-3">{(question as Question & { question?: string }).question}</p>
          <p className="text-amber-600 text-sm">參考答案：{(question as Question & { reference_answer?: string }).reference_answer ?? '—'}</p>
        </>
      )}
      {!['multiple_choice', 'choice', 'fill_blank', 'fill', 'true_false', 'judge', 'reorder', 'order', 'matching', 'match', 'short_answer'].includes(type) && (
        <p className="text-amber-800">{(question as Question & { question?: string }).question}</p>
      )}
    </div>
  )
}

function DictationPreviewBlock({
  index,
  word,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  index: number
  word: DictationWord
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border-2 border-amber-100 bg-white p-3 group">
      <span className="font-medium text-amber-900 w-8">{index + 1}.</span>
      <div className="flex-1">
        <span className="text-lg font-semibold text-amber-900">{word.word}</span>
        {word.pinyin && <span className="ml-2 text-amber-600 text-sm">{word.pinyin}</span>}
        {word.hint && <span className="ml-2 text-amber-500 text-sm">（{word.hint}）</span>}
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
        <button type="button" onClick={onMoveUp} disabled={!canMoveUp} className="p-1 text-amber-600 text-xs">↑</button>
        <button type="button" onClick={onMoveDown} disabled={!canMoveDown} className="p-1 text-amber-600 text-xs">↓</button>
        <button type="button" onClick={onDelete} className="p-1 text-red-600 text-xs">刪除</button>
      </div>
    </div>
  )
}

export type ContentShape = { type?: string; questions?: Question[]; words?: DictationWord[] }

export default function QuestionPreview({
  content,
  onChange,
  editable = true,
}: {
  content: ContentShape
  onChange: (next: ContentShape) => void
  editable?: boolean
}) {
  const isDictation = content.type === 'dictation' || (Array.isArray(content.words) && content.words.length > 0)
  const words = (content.words ?? []) as DictationWord[]
  const questions = (content.questions ?? []) as Question[]

  if (isDictation) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-amber-800">默書詞表（共 {words.length} 個詞）</p>
        {words.map((w, i) => (
          <DictationPreviewBlock
            key={i}
            index={i}
            word={w}
            onDelete={() => {
              const next = words.filter((_, j) => j !== i)
              onChange({ ...content, words: next })
            }}
            onMoveUp={() => {
              if (i === 0) return
              const next = [...words]
              ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
              onChange({ ...content, words: next })
            }}
            onMoveDown={() => {
              if (i >= words.length - 1) return
              const next = [...words]
              ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
              onChange({ ...content, words: next })
            }}
            canMoveUp={i > 0}
            canMoveDown={i < words.length - 1}
          />
        ))}
      </div>
    )
  }

  const addQuestion = () => {
    const blank: Question = {
      type: 'multiple_choice',
      question: '請編輯題目內容',
      options: ['A', 'B', 'C', 'D'],
      correct: 0,
    }
    onChange({ ...content, questions: [...questions, blank], type: 'quiz' })
  }

  if (questions.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-amber-600">尚無題目</p>
        {editable && (
          <button type="button" onClick={addQuestion} className="px-4 py-2 rounded-lg border-2 border-dashed border-amber-300 text-amber-700 text-sm hover:bg-amber-50">
            + 新增題目
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-amber-800">共 {questions.length} 題</p>
        {editable && (
          <button type="button" onClick={addQuestion} className="px-3 py-1 rounded-lg border border-amber-200 text-amber-700 text-sm hover:bg-amber-50">
            + 新增題目
          </button>
        )}
      </div>
      {questions.map((q, i) => (
        <PreviewBlock
          key={i}
          index={i}
          question={q}
          onDelete={() => {
            const next = questions.filter((_, j) => j !== i)
            onChange({ ...content, questions: next, type: 'quiz' })
          }}
          onMoveUp={() => {
            if (i === 0) return
            const next = [...questions]
            ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
            onChange({ ...content, questions: next, type: 'quiz' })
          }}
          onMoveDown={() => {
            if (i >= questions.length - 1) return
            const next = [...questions]
            ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
            onChange({ ...content, questions: next, type: 'quiz' })
          }}
          onEdit={(edited) => {
            const next = [...questions]
            next[i] = edited
            onChange({ ...content, questions: next, type: 'quiz' })
          }}
          canMoveUp={i > 0}
          canMoveDown={i < questions.length - 1}
        />
      ))}
    </div>
  )
}
