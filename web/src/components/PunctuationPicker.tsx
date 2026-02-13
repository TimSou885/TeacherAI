type PunctuationPickerProps = {
  value: string
  onChange: (v: string) => void
  className?: string
}

const PUNCTUATION_BUTTONS = [
  { symbol: '，', label: '逗號' },
  { symbol: '。', label: '句號' },
  { symbol: '、', label: '頓號' },
  { symbol: '；', label: '分號' },
  { symbol: '：', label: '冒號' },
  { symbol: '「」', label: '引號' },
  { symbol: '『』', label: '單引號' },
  { symbol: '！', label: '驚嘆號' },
  { symbol: '？', label: '問號' },
  { symbol: '（）', label: '括號' },
] as const

export default function PunctuationPicker({ value, onChange, className = '' }: PunctuationPickerProps) {
  function handleAppend(symbol: string) {
    onChange(value + symbol)
  }

  function handleDelete() {
    onChange(value.slice(0, -1))
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="min-h-[44px] py-2 px-3 rounded-lg border-2 border-amber-200 bg-amber-50 flex items-center">
        <span className="text-amber-900 text-lg">已選：{value || '（尚未選擇）'}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {PUNCTUATION_BUTTONS.map(({ symbol, label }) => (
          <button
            key={symbol}
            type="button"
            onClick={() => handleAppend(symbol)}
            aria-label={label}
            className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-amber-100 text-amber-900 font-medium text-lg hover:bg-amber-200 touch-manipulation"
          >
            {symbol}
          </button>
        ))}
        <button
          type="button"
          onClick={handleDelete}
          disabled={value.length === 0}
          aria-label="刪除最後一個"
          className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-200 text-amber-900 font-medium disabled:opacity-50 touch-manipulation"
        >
          刪除
        </button>
      </div>
    </div>
  )
}
