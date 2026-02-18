import { useState, useEffect } from 'react'

export default function MatchingQuestion({
  question,
  value,
  onChange,
}: {
  question: { question?: string; left?: string[]; right?: string[]; options?: string[] }
  value: unknown
  onChange: (v: unknown) => void
}) {
  const [selectedLeftIdx, setSelectedLeftIdx] = useState<number | null>(null)
  const [lastPairedIdx, setLastPairedIdx] = useState<number | null>(null)
  const opts = Array.isArray(question.options) ? (question.options as string[]) : []
  const left = (question.left ?? []).length > 0 ? question.left! : opts.map((_, i) => `${i + 1}`)
  const right = (question.right ?? opts) as string[]
  const pairList = (Array.isArray(value) ? value : []) as number[][]
  const pairs: number[] = left.map((_, i) => pairList.find((p) => p[0] === i)?.[1] ?? 0)
  const isOneToOne = left.length === right.length
  const usedRightIndices = isOneToOne ? new Set(pairs) : new Set<number>()
  const distinctRights = new Set(pairs.filter((r) => right[r] != null)).size

  useEffect(() => {
    if (left.length > 0 && right.length > 0 && (pairList.length !== left.length || value === undefined)) {
      onChange(left.map((_, i) => [i, 0]))
    }
  }, [left.length, right.length, pairList.length, value, onChange])

  useEffect(() => {
    if (lastPairedIdx === null) return
    const t = setTimeout(() => setLastPairedIdx(null), 500)
    return () => clearTimeout(t)
  }, [lastPairedIdx])

  function setPair(leftIdx: number, rightIdx: number) {
    const next = pairs.slice()
    next[leftIdx] = rightIdx
    onChange(next.map((r, l) => [l, r]))
    setLastPairedIdx(leftIdx)
  }

  function handleLeftClick(i: number) {
    if (selectedLeftIdx === i) {
      setSelectedLeftIdx(null)
    } else {
      setSelectedLeftIdx(i)
    }
  }

  function handleRightClick(j: number) {
    if (selectedLeftIdx === null) return
    if (isOneToOne && usedRightIndices.has(j) && pairs[selectedLeftIdx] !== j) return
    setPair(selectedLeftIdx, j)
    setSelectedLeftIdx(null)
  }

  return (
    <div className="space-y-4">
      {question.question != null && question.question !== '' && <p className="text-amber-800 text-base mb-2">{question.question}</p>}
      <p className="text-amber-700 text-base mb-1">
        {selectedLeftIdx !== null ? '再點右邊要連起來的' : '先點左邊，再點右邊把它們連起來'}
      </p>
      {left.length > 0 && isOneToOne && (
        <p className="text-amber-600 text-sm">已連好 {distinctRights} / {left.length} 組</p>
      )}
      {selectedLeftIdx !== null && (
        <button
          type="button"
          onClick={() => setSelectedLeftIdx(null)}
          className="text-sm text-amber-600 underline"
        >
          取消選取
        </button>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-3">
          <p className="text-sky-700 text-sm font-medium">左邊</p>
          {left.map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleLeftClick(i)}
              className={`w-full min-h-[48px] py-3 px-4 rounded-xl border-2 text-left touch-manipulation focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 text-base transition-colors ${
                selectedLeftIdx === i
                  ? 'border-amber-500 ring-2 ring-amber-500 bg-amber-100'
                  : 'border-sky-200 bg-sky-50/80 hover:bg-sky-100/80'
              }`}
            >
              {label}
              {pairs[i] !== undefined && right[pairs[i]] != null && (
                <span className="block text-sky-600 text-sm mt-1">→ {right[pairs[i]]}</span>
              )}
              {lastPairedIdx === i && (
                <span className="ml-2 text-green-600 font-medium">✓</span>
              )}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          <p className="text-emerald-700 text-sm font-medium">右邊</p>
          <div className="flex flex-wrap gap-2">
            {right.map((opt, j) => {
              const isPaired = isOneToOne && pairs.some((r) => r === j)
              const isPairedBySelected = selectedLeftIdx !== null && pairs[selectedLeftIdx] === j
              const canSelect = !isOneToOne || !isPaired || isPairedBySelected
              return (
                <button
                  key={j}
                  type="button"
                  onClick={() => handleRightClick(j)}
                  disabled={selectedLeftIdx === null || !canSelect}
                  className={`min-h-[48px] min-w-[88px] px-4 py-2 rounded-xl border-2 text-center text-base touch-manipulation focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors ${
                    selectedLeftIdx !== null && canSelect
                      ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100'
                      : isPaired && !isPairedBySelected
                        ? 'border-emerald-100 bg-emerald-50/50 text-emerald-600'
                        : 'border-emerald-200 bg-emerald-50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
