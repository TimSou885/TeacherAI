import { useState } from 'react'
import StrokeAnimator from '../../components/StrokeAnimator'
import StrokeQuiz from '../../components/StrokeQuiz'

const COMMON_CHARS = '一二三四五六七八九十人大小口中日木水火土山石田禾上下左右手足目耳'

function isSingleCJK(s: string): boolean {
  return /^[\u4e00-\u9fff]$/.test(s.trim())
}

export default function StrokePractice() {
  const [input, setInput] = useState('')
  const [char, setChar] = useState<string | null>(null)
  const [view, setView] = useState<'pick' | 'animator' | 'quiz'>('pick')

  const currentChar = char ?? (isSingleCJK(input) ? input.trim() : null)

  function handleRandom() {
    const idx = Math.floor(Math.random() * COMMON_CHARS.length)
    const c = COMMON_CHARS[idx]!
    setInput(c)
    setChar(c)
  }

  function goToAnimator() {
    if (!currentChar) return
    setView('animator')
  }

  function goToQuiz() {
    if (!currentChar) return
    setView('quiz')
  }

  function reset() {
    setChar(null)
    setInput('')
    setView('pick')
  }

  if (view === 'animator') {
    return (
      <div className="flex-1 overflow-auto p-6 flex flex-col">
        <h2 className="text-lg font-semibold text-amber-900 mb-4">筆順：{currentChar}</h2>
        <div className="flex justify-center mb-6">
          <StrokeAnimator character={currentChar!} size={120} showOutline autoPlay />
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={goToQuiz}
            className="min-h-[44px] px-6 py-3 rounded-xl bg-amber-500 text-white font-medium touch-manipulation"
          >
            開始筆順測驗
          </button>
          <button
            type="button"
            onClick={reset}
            className="min-h-[44px] px-6 py-3 rounded-xl bg-amber-100 text-amber-900 font-medium touch-manipulation"
          >
            再練一字
          </button>
        </div>
      </div>
    )
  }

  if (view === 'quiz') {
    return (
      <div className="flex-1 overflow-auto p-6 flex flex-col">
        <h2 className="text-lg font-semibold text-amber-900 mb-4">筆順測驗：{currentChar}</h2>
        <div className="flex justify-center mb-6">
          <StrokeQuiz
            character={currentChar!}
            size={150}
            showHintAfterMisses={3}
            onComplete={() => {}}
          />
        </div>
        <button
          type="button"
          onClick={reset}
          className="min-h-[44px] px-6 py-3 rounded-xl bg-amber-100 text-amber-900 font-medium touch-manipulation"
        >
          再練一字
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto p-6 flex flex-col">
      <h2 className="text-lg font-semibold text-amber-900 mb-2">筆順測驗</h2>
      <p className="text-amber-800/80 text-sm mb-4">輸入一個字或按隨機一字，可先看筆順再開始測驗。</p>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={input}
          onChange={(e) => {
            const v = e.target.value
            if (v.length <= 1) setInput(v)
            else if (/[\u4e00-\u9fff]/.test(v)) setInput(v[v.length - 1]!)
          }}
          placeholder="輸入一個字"
          maxLength={2}
          className="flex-1 min-h-[44px] py-3 px-4 rounded-xl border-2 border-amber-200 text-lg"
        />
        <button
          type="button"
          onClick={handleRandom}
          className="min-h-[44px] px-5 py-3 rounded-xl bg-amber-200 text-amber-900 font-medium touch-manipulation shrink-0"
        >
          隨機一字
        </button>
      </div>
      {currentChar && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={goToAnimator}
            className="min-h-[44px] px-6 py-3 rounded-xl bg-amber-500 text-white font-medium touch-manipulation"
          >
            看筆順
          </button>
          <button
            type="button"
            onClick={goToQuiz}
            className="min-h-[44px] px-6 py-3 rounded-xl bg-amber-100 text-amber-900 font-medium touch-manipulation"
          >
            開始筆順測驗
          </button>
        </div>
      )}
    </div>
  )
}
