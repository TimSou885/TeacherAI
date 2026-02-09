import { useRef, useEffect, useState } from 'react'
import HanziWriter from 'hanzi-writer'

type Props = {
  /** 單一漢字 */
  character: string
  /** 寬高（px），觸控友善建議 ≥ 150 */
  size?: number
  /** 畫錯幾次後顯示正確筆順提示 */
  showHintAfterMisses?: number | false
  onComplete?: (summary: { character: string; totalMistakes: number }) => void
  className?: string
}

export default function StrokeQuiz({
  character,
  size = 150,
  showHintAfterMisses = 3,
  onComplete,
  className = '',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const writerRef = useRef<HanziWriter | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'complete'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [mistakes, setMistakes] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    const char = character.trim()
    if (!el || !char || char.length > 1) {
      if (char.length > 1) setError('請傳入單一漢字')
      return
    }
    setError(null)
    setStatus('loading')
    setMistakes(0)
    let cancelled = false
    const writer = HanziWriter.create(el, char, {
      width: size,
      height: size,
      padding: 10,
      showOutline: true,
      showCharacter: true,
      showHintAfterMisses,
      highlightOnComplete: true,
      onMistake: () => !cancelled && setMistakes((m) => m + 1),
      onComplete: (summary) => {
        if (cancelled) return
        setStatus('complete')
        setMistakes(summary.totalMistakes)
        onComplete?.(summary)
      },
    })
    writerRef.current = writer
    setStatus('ready')
    writer.quiz({ showHintAfterMisses }).then(() => {
      if (!cancelled) setStatus('complete')
    })
    return () => {
      cancelled = true
      writer.cancelQuiz?.()
      writerRef.current = null
    }
  }, [character, size, showHintAfterMisses])

  if (error) {
    return (
      <div className={`text-red-600 text-sm ${className}`} role="alert">
        {error}
      </div>
    )
  }

  return (
    <div className={`inline-flex flex-col items-center gap-2 ${className}`}>
      <div ref={containerRef} aria-hidden />
      {status === 'ready' && <p className="text-amber-800 text-sm">用手指或滑鼠依筆順描畫</p>}
      {status === 'complete' && (
        <p className="text-green-600 font-medium text-sm">完成！共 {mistakes} 次筆順錯誤</p>
      )}
    </div>
  )
}
