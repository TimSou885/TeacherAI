import { useState, useEffect } from 'react'

export default function MatchingQuestion({
  question,
  value,
  onChange,
}: {
  question: { question?: string; left?: string[]; right?: string[]; options?: string[] | Record<string, string> }
  value: unknown
  onChange: (v: unknown) => void
}) {
  const [selectedLeftIdx, setSelectedLeftIdx] = useState<number | null>(null)
  const [lastPairedIdx, setLastPairedIdx] = useState<number | null>(null)
  const optsRaw = question.options
  const optsIsArray = Array.isArray(optsRaw)
  const optsAsObject = optsRaw != null && typeof optsRaw === 'object' && !Array.isArray(optsRaw) ? (optsRaw as Record<string, string>) : null
  const opts = optsIsArray ? (optsRaw as string[]) : []
  const leftFromOptions = optsAsObject ? Object.keys(optsAsObject) : (opts.length > 0 ? opts.map((_, i) => `${i + 1}`) : [])
  const rightFromOptions = optsAsObject ? Object.values(optsAsObject) : opts
  const left = (question.left ?? []).length > 0 ? question.left! : leftFromOptions
  const right = (question.right ?? rightFromOptions) as string[]
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
        {selectedLeftIdx !== null ? '再點右邊對應項' : '點選相配的一對：先點左邊一項，再點右邊對應項'}
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
      <div className="grid grid-cols-2 gap-4 min-w-0">
        <div className="flex flex-col gap-2 min-w-0">
          <p className="rounded-full bg-amber-100 text-amber-800 text-sm font-medium px-3 py-1 w-fit">左邊</p>
          {left.map((label, i) => {
            const isSelected = selectedLeftIdx === i
            const leftCardBase = 'w-full min-h-[52px] py-3 px-4 rounded-2xl border-2 text-center text-base touch-manipulation focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all duration-150 min-w-0 shadow-sm'
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleLeftClick(i)}
                className={`${leftCardBase} ${
                  isSelected
                    ? 'border-amber-500 ring-2 ring-amber-500 bg-amber-100 text-amber-900 font-medium shadow-md'
                    : 'border-amber-200 bg-amber-50/90 text-amber-900 hover:bg-amber-100/90 hover:border-amber-300 hover:shadow-md'
                }`}
              >
                <span className="font-medium">{label}</span>
                {pairs[i] !== undefined && right[pairs[i]] != null && (
                  <span className="block text-amber-700 text-xs mt-0.5">→ {right[pairs[i]]}</span>
                )}
                {lastPairedIdx === i && (
                  <span className="ml-1 text-green-600 font-semibold text-sm">✓</span>
                )}
              </button>
            )
          })}
        </div>
        <div className="flex flex-col gap-2 min-w-0">
          <p className="rounded-full bg-amber-100 text-amber-800 text-sm font-medium px-3 py-1 w-fit">右邊</p>
          {right.map((opt, j) => {
            const isPaired = isOneToOne && pairs.some((r) => r === j)
            const isPairedBySelected = selectedLeftIdx !== null && pairs[selectedLeftIdx] === j
            const canSelect = !isOneToOne || !isPaired || isPairedBySelected
            const rightCardBase = 'w-full min-h-[52px] py-3 px-4 rounded-2xl border-2 text-center text-base touch-manipulation focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all duration-150 min-w-0'
            const rightCardClass =
              selectedLeftIdx !== null && canSelect
                ? 'border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 shadow-sm hover:shadow-md'
                : isPaired && !isPairedBySelected
                  ? 'border-amber-100 bg-amber-50/50 text-amber-600 shadow-none'
                  : 'border-amber-200 bg-white text-amber-900 shadow-sm hover:shadow-md hover:border-amber-300'
            return (
              <button
                key={j}
                type="button"
                onClick={() => handleRightClick(j)}
                disabled={selectedLeftIdx === null || !canSelect}
                className={`${rightCardBase} ${rightCardClass} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {opt}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
