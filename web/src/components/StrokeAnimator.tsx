import { useRef, useEffect, useState } from 'react'
import HanziWriter from 'hanzi-writer'

type Props = {
  /** 單一漢字 */
  character: string
  /** 寬高（px），觸控友善建議 ≥ 120 */
  size?: number
  /** 是否顯示筆順框線 */
  showOutline?: boolean
  /** 載入後自動播放一次筆順動畫 */
  autoPlay?: boolean
  onComplete?: () => void
  className?: string
}

export default function StrokeAnimator({
  character,
  size = 120,
  showOutline = true,
  autoPlay = false,
  onComplete,
  className = '',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const writerRef = useRef<HanziWriter | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const el = containerRef.current
    const char = character.trim()
    if (!el || !char || char.length > 1) {
      if (char.length > 1) setError('請傳入單一漢字')
      return
    }
    setError(null)
    setReady(false)
    try {
      const writer = HanziWriter.create(el, char, {
        width: size,
        height: size,
        padding: 8,
        showOutline,
        strokeAnimationSpeed: 1.2,
        delayBetweenStrokes: 600,
      })
      writerRef.current = writer
      if (autoPlay) {
        writer.animateCharacter({ onComplete: () => onComplete?.() }).then(() => setReady(true))
      } else {
        setReady(true)
      }
    } catch (e) {
      setError((e as Error).message || '無法載入筆順')
    }
    return () => {
      writerRef.current = null
    }
  }, [character, size, showOutline, autoPlay])

  function play() {
    writerRef.current?.animateCharacter({ onComplete: () => onComplete?.() })
  }

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
      {ready && (
        <button
          type="button"
          onClick={play}
          className="min-h-[44px] min-w-[44px] rounded-full bg-amber-500 text-white flex items-center justify-center hover:bg-amber-600 touch-manipulation text-sm"
          aria-label="再播一次筆順"
        >
          再播一次
        </button>
      )}
    </div>
  )
}
