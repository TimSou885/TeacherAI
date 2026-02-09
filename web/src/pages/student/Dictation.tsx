import { useState, useEffect } from 'react'
import { apiFetch, getTtsUrl } from '../../lib/api'
import AudioPlayer from '../../components/AudioPlayer'
import StrokeAnimator from '../../components/StrokeAnimator'
import StrokeQuiz from '../../components/StrokeQuiz'

type DictationItem = { word: string; pinyin?: string; hint?: string }
type ExerciseSummary = { id: string; title: string; category: string; created_at: string }
type Mode = 'listen' | 'hint' | 'pinyin'

function normalizeAnswer(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, '')
    .replace(/［/g, '[')
    .replace(/［/g, ']')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
}

export default function Dictation() {
  const [view, setView] = useState<'list' | 'session'>('list')
  const [exercises, setExercises] = useState<ExerciseSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<{ id: string; title: string; questions: DictationItem[] } | null>(null)
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [result, setResult] = useState<'pending' | 'correct' | 'wrong' | null>(null)
  const [mode, setMode] = useState<Mode>('listen')
  const [ttsUrl, setTtsUrl] = useState<string | null>(null)
  const [ttsLoading, setTtsLoading] = useState(false)
  const [ttsBlob, setTtsBlob] = useState(false)
  const [ttsError, setTtsError] = useState<string | null>(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [showStrokeForWord, setShowStrokeForWord] = useState<string | null>(null)
  const [strokeQuizChar, setStrokeQuizChar] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    apiFetch('/api/exercises?category=dictation', undefined, { preferStudent: true })
      .then((res) => {
        if (cancelled) return
        if (!res.ok) throw new Error('無法載入練習')
        return res.json()
      })
      .then((data: { exercises?: ExerciseSummary[] }) => {
        if (cancelled) return
        setExercises(data.exercises ?? [])
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : '載入失敗'))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [])

  function startExercise(ex: ExerciseSummary) {
    setError('')
    apiFetch(`/api/exercises/${ex.id}`, undefined, { preferStudent: true })
      .then((res) => {
        if (!res.ok) throw new Error('無法載入題目')
        return res.json()
      })
      .then((data: { id: string; title: string; questions?: DictationItem[] }) => {
        const questions = Array.isArray(data.questions) ? data.questions : []
        if (questions.length === 0) {
          setError('此練習尚無題目')
          return
        }
        setSelected({ id: data.id, title: data.title, questions })
        setView('session')
        setIndex(0)
        setInput('')
        setResult(null)
        setScore({ correct: 0, total: questions.length })
        setTtsUrl(null)
      })
      .catch((e) => setError(e instanceof Error ? e.message : '載入失敗'))
  }

  const current = selected ? selected.questions[index] : null
  const isLast = selected && index >= selected.questions.length - 1

  useEffect(() => {
    if (!current || mode !== 'listen') return
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/ce4da3a2-50de-4590-a46a-3e3626a1067e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dictation.tsx:ttsEffect',message:'TTS effect run',data:{word:current?.word,mode},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    setTtsUrl(null)
    setTtsError(null)
    setTtsLoading(true)
    getTtsUrl(current.word, { preferStudent: true })
      .then((url) => {
        setTtsUrl(url)
        setTtsBlob(url.startsWith('blob:'))
      })
      .catch((e) => {
        setTtsUrl(null)
        setTtsError(e instanceof Error ? e.message : '無法載入語音')
      })
      .finally(() => setTtsLoading(false))
  }, [current?.word, mode])

  function check() {
    if (!current) return
    const normalized = normalizeAnswer(input)
    const expected = normalizeAnswer(current.word)
    const correct = normalized === expected
    setResult(correct ? 'correct' : 'wrong')
    setScore((s) => ({ ...s, correct: s.correct + (correct ? 1 : 0) }))
  }

  function next() {
    if (!selected) return
    setResult(null)
    setInput('')
    setTtsUrl(null)
    setShowStrokeForWord(null)
    setStrokeQuizChar(null)
    if (isLast) {
      setView('list')
      setSelected(null)
      return
    }
    setIndex((i) => i + 1)
  }

  if (view === 'list') {
    return (
      <div className="flex-1 overflow-auto p-6">
        <h2 className="text-lg font-semibold text-amber-900 mb-4">默書練習</h2>
        <p className="text-amber-800/80 text-sm mb-4">選擇一份默書，依提示寫出詞語。</p>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        {loading ? (
          <p className="text-amber-700">載入中…</p>
        ) : exercises.length === 0 ? (
          <p className="text-amber-700">尚無默書練習，請聯絡老師。</p>
        ) : (
          <ul className="space-y-3">
            {exercises.map((ex) => (
              <li key={ex.id}>
                <button
                  type="button"
                  onClick={() => startExercise(ex)}
                  className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-white border-2 border-amber-200 text-amber-900 font-medium text-left hover:bg-amber-50 touch-manipulation"
                >
                  {ex.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto p-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => { setView('list'); setSelected(null) }}
          className="text-amber-700 text-sm underline"
        >
          ← 返回列表
        </button>
        <span className="text-amber-800 text-sm">
          第 {index + 1} / {selected!.questions.length} 題
        </span>
      </div>
      <h3 className="text-lg font-semibold text-amber-900 mb-2">{selected!.title}</h3>

      {!current ? null : (
        <>
          <div className="flex gap-2 mb-4">
            {(['listen', 'hint', 'pinyin'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`min-h-[44px] px-4 rounded-xl font-medium touch-manipulation ${
                  mode === m
                    ? 'bg-amber-500 text-white'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {m === 'listen' ? '聽寫' : m === 'hint' ? '解釋' : '拼音'}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-amber-100 p-6 mb-6">
            {mode === 'listen' && (
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                <AudioPlayer
                  src={ttsLoading ? null : ttsUrl}
                  isBlob={ttsBlob}
                  autoPlay
                  onError={() => setTtsError('播放失敗，請檢查網路或稍後再試')}
                  className="shrink-0"
                />
                {ttsLoading && <span className="text-amber-600">準備播放…</span>}
                {ttsError && (
                  <span className="text-red-600 text-sm" role="alert">
                    {ttsError}
                  </span>
                )}
              </div>
            )}
            {mode === 'hint' && current.hint && (
              <p className="text-amber-800 mb-4">提示：{current.hint}</p>
            )}
            {mode === 'pinyin' && current.pinyin && (
              <p className="text-amber-800 mb-4">拼音：{current.pinyin}</p>
            )}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="輸入詞語"
              className="w-full py-3 px-4 rounded-xl border-2 border-amber-200 text-lg"
              disabled={result !== null}
            />
          </div>

          {result === 'correct' && (
            <p className="text-green-600 font-medium mb-4">答對了！</p>
          )}
          {result === 'wrong' && (
            <div className="mb-4">
              <p className="text-red-600 font-medium">正確答案：{current.word}</p>
              <button
                type="button"
                onClick={() => setShowStrokeForWord(current.word)}
                className="mt-2 min-h-[44px] px-4 py-2 rounded-xl bg-amber-100 text-amber-900 font-medium hover:bg-amber-200 touch-manipulation"
              >
                看筆順
              </button>
            </div>
          )}

          {showStrokeForWord && (
            <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-amber-900 font-medium">筆順：{showStrokeForWord}</span>
                <button
                  type="button"
                  onClick={() => { setShowStrokeForWord(null); setStrokeQuizChar(null) }}
                  className="text-amber-700 text-sm underline"
                >
                  關閉
                </button>
              </div>
              {strokeQuizChar ? (
                <div>
                  <p className="text-amber-800 text-sm mb-2">依筆順描畫「{strokeQuizChar}」</p>
                  <StrokeQuiz
                    character={strokeQuizChar}
                    size={140}
                    showHintAfterMisses={3}
                    onComplete={() => setStrokeQuizChar(null)}
                  />
                  <button
                    type="button"
                    onClick={() => setStrokeQuizChar(null)}
                    className="mt-3 min-h-[44px] px-4 rounded-xl bg-amber-100 text-amber-900 font-medium touch-manipulation"
                  >
                    返回筆順動畫
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-6 justify-center">
                    {Array.from(showStrokeForWord)
                      .filter((c) => /[\u4e00-\u9fff]/.test(c))
                      .map((c) => (
                        <StrokeAnimator key={c} character={c} size={100} showOutline autoPlay />
                      ))}
                  </div>
                  <p className="text-amber-800 text-sm mt-3">想練習寫這個字嗎？</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Array.from(showStrokeForWord)
                      .filter((c) => /[\u4e00-\u9fff]/.test(c))
                      .map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setStrokeQuizChar(c)}
                          className="min-h-[44px] min-w-[44px] rounded-xl bg-amber-200 text-amber-900 font-medium hover:bg-amber-300 touch-manipulation"
                        >
                          {c} 筆順測驗
                        </button>
                      ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex gap-3">
            {result === null ? (
              <button
                type="button"
                onClick={check}
                disabled={!input.trim()}
                className="min-h-[44px] px-6 py-3 rounded-xl bg-amber-500 text-white font-medium disabled:opacity-50 touch-manipulation"
              >
                對答案
              </button>
            ) : (
              <button
                type="button"
                onClick={next}
                className="min-h-[44px] px-6 py-3 rounded-xl bg-amber-500 text-white font-medium touch-manipulation"
              >
                {isLast ? '完成' : '下一題'}
              </button>
            )}
          </div>

          {result !== null && isLast && (
            <p className="mt-6 text-amber-800">
              本次得分：{score.correct} / {score.total}
            </p>
          )}
        </>
      )}
    </div>
  )
}
