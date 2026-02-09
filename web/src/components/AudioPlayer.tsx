import { useRef, useEffect, useState } from 'react'

type Props = {
  /** 音頻 URL（來自 getTtsUrl 或 /api/tts/play） */
  src: string | null
  /** 是否為 blob URL（組件卸載時需 revoke） */
  isBlob?: boolean
  /** 載入後自動播放一次（如聽寫模式） */
  autoPlay?: boolean
  onEnded?: () => void
  onError?: () => void
  className?: string
}

export default function AudioPlayer({ src, isBlob, autoPlay, onEnded, onError, className }: Props) {
  const ref = useRef<HTMLAudioElement>(null)
  const lastAutoPlayedSrcRef = useRef<string | null>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!src) return
    const el = ref.current
    if (!el) return
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/ce4da3a2-50de-4590-a46a-3e3626a1067e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AudioPlayer.tsx:effect',message:'effect run',data:{hasSrc:!!src,autoPlay,srcLen:typeof src==='string'?src.length:0},timestamp:Date.now(),hypothesisId:'H1_H3_H5'})}).catch(()=>{});
    // #endregion
    el.src = src
    const end = () => {
      setPlaying(false)
      onEnded?.()
    }
    const err = () => {
      setPlaying(false)
      onError?.()
    }
    el.addEventListener('ended', end)
    el.addEventListener('error', err)
    const tryAutoPlay = () => {
      if (!autoPlay) return
      if (lastAutoPlayedSrcRef.current === src) return
      lastAutoPlayedSrcRef.current = src
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/ce4da3a2-50de-4590-a46a-3e3626a1067e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AudioPlayer.tsx:tryAutoPlay',message:'calling play()',data:{readyState:el.readyState},timestamp:Date.now(),hypothesisId:'post-fix'})}).catch(()=>{});
      // #endregion
      el.play().then(() => setPlaying(true)).catch(() => { /* 瀏覽器阻擋時不報錯 */ })
    }
    if (el.readyState >= 3) tryAutoPlay()
    else el.addEventListener('canplaythrough', tryAutoPlay, { once: true })
    return () => {
      el.removeEventListener('ended', end)
      el.removeEventListener('error', err)
      el.removeEventListener('canplaythrough', tryAutoPlay)
      if (isBlob) URL.revokeObjectURL(src)
    }
  }, [src, isBlob, autoPlay, onEnded, onError])

  function play() {
    if (!ref.current || !src) return
    ref.current.currentTime = 0
    ref.current.play().then(() => setPlaying(true)).catch(onError)
  }

  return (
    <div className={className}>
      <audio ref={ref} />
      <button
        type="button"
        onClick={play}
        disabled={!src}
        className="min-h-[44px] min-w-[44px] rounded-full bg-amber-500 text-white flex items-center justify-center hover:bg-amber-600 disabled:opacity-50 touch-manipulation"
        aria-label="播放"
      >
        {playing ? (
          <span className="text-sm">播放中…</span>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
    </div>
  )
}
