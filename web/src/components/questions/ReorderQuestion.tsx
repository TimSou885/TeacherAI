import { useState, useEffect } from 'react'

function parseSentencesFromQuestion(q: string): string[] {
  if (!q || typeof q !== 'string') return []
  const content = q.includes('：') ? q.split('：')[1] ?? q : q.includes(':') ? q.split(':')[1] ?? q : q
  const trimNum = (s: string) => s.replace(/^[\d①②③④⑤⑥⑦⑧⑨⑩、．.\s]+/, '').trim()
  const byNewline = content.split(/\n+/).map(trimNum).filter((s) => s.length > 0)
  if (byNewline.length >= 2) return byNewline
  const byPunct = content.split(/[。；]+/).map(trimNum).filter((s) => s.length > 0)
  return byPunct.length >= 2 ? byPunct : []
}

export default function ReorderQuestion({
  question,
  value,
  onChange,
}: {
  question: { sentences?: string[]; options?: string[]; question?: string; correct_order?: number[] }
  value: unknown
  onChange: (v: unknown) => void
}) {
  const fromSentences = (question.sentences ?? []) as string[]
  const fromOptions = Array.isArray(question.options) ? (question.options as string[]) : []
  const fromParse = parseSentencesFromQuestion(question.question ?? '')
  const sentences = fromSentences.length > 0 ? fromSentences : fromOptions.length > 0 ? fromOptions : fromParse
  const currentOrder = (Array.isArray(value) ? value : []) as number[]
  const order = currentOrder.length > sentences.length ? currentOrder.slice(0, sentences.length) : currentOrder

  useEffect(() => {
    if (sentences.length > 0 && value === undefined) {
      onChange(sentences.map((_, i) => i))
    }
  }, [sentences.length, value, onChange])

  const filledCount = order.length
  const remainingIndices = sentences.map((_, i) => i).filter((i) => !order.includes(i))

  function handleTokenClick(sentenceIdx: number) {
    if (filledCount >= sentences.length) return
    onChange([...order, sentenceIdx])
  }

  function handleSlotClear(pos: number) {
    if (order[pos] === undefined) return
    const next = [...order.slice(0, pos), ...order.slice(pos + 1)]
    onChange(next)
  }

  return (
    <div className="space-y-4">
      <p className="text-amber-800 text-base mb-2">
        依正確順序點選下方字詞，填入空格
      </p>
      <div className="flex flex-wrap gap-2 items-center">
        {sentences.map((_, pos) => (
          <button
            key={pos}
            type="button"
            onClick={() => handleSlotClear(pos)}
            className={`min-h-[48px] min-w-[80px] flex-1 rounded-xl border-2 text-center text-base touch-manipulation focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
              order[pos] !== undefined
                ? 'border-amber-300 bg-amber-100 text-amber-900 py-2 px-3'
                : 'border-dashed border-amber-300 bg-amber-50/50 text-amber-400'
            }`}
          >
            {order[pos] !== undefined ? (sentences[order[pos]] ?? '') : '　'}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        <p className="text-amber-600 text-sm font-medium">字詞池</p>
        <div className="flex flex-wrap gap-2">
          {remainingIndices.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleTokenClick(i)}
              className="min-h-[48px] px-4 py-2 rounded-xl border-2 border-amber-200 bg-amber-50 text-amber-900 text-base touch-manipulation hover:bg-amber-100 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors"
            >
              {sentences[i] ?? ''}
            </button>
          ))}
        </div>
      </div>
      {filledCount > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="text-sm text-amber-600 underline"
        >
          全部重填
        </button>
      )}
    </div>
  )
}
