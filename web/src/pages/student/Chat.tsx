import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiChatStream, apiFetch } from '../../lib/api'

type Message = { id: string; role: 'user' | 'assistant'; content: string }

type ConversationSummary = { id: string; title: string | null; updated_at: string }

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadConversations() {
    const res = await apiFetch('/api/conversations')
    if (!res.ok) return
    const data = (await res.json()) as { conversations?: ConversationSummary[] }
    setConversations(data.conversations ?? [])
  }

  useEffect(() => {
    loadConversations()
  }, [])

  async function loadConversation(id: string) {
    const res = await apiFetch(`/api/conversations/${id}`)
    if (!res.ok) return
    const data = (await res.json()) as { messages?: Message[] }
    setMessages(data.messages ?? [])
    setConversationId(id)
    setShowHistory(false)
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    const assistantId = crypto.randomUUID()
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])
    setStreaming(true)
    try {
      await apiChatStream(
        {
          conversationId: conversationId ?? undefined,
          message: text,
          subject: 'chinese',
        },
        (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + chunk } : m
            )
          )
        },
        (newConvId) => {
          setConversationId(newConvId)
          loadConversations()
        }
      )
    } catch (e) {
      const err = e instanceof Error ? e.message : '發送失敗'
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: `錯誤：${err}` } : m
        )
      )
    } finally {
      setStreaming(false)
    }
  }

  function startNewChat() {
    setConversationId(null)
    setMessages([])
    setShowHistory(false)
  }

  async function deleteConversation(id: string) {
    if (!window.confirm('確定要刪除這則對話嗎？')) return
    const res = await apiFetch(`/api/conversations/${id}`, { method: 'DELETE' })
    if (!res.ok) return
    if (conversationId === id) {
      setConversationId(null)
      setMessages([])
    }
    setConversations((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div className="flex flex-col h-screen bg-amber-50">
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-amber-100">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="p-2 rounded-lg hover:bg-amber-100 text-amber-900"
            aria-label="對話歷史"
          >
            <HistoryIcon />
          </button>
          <button
            type="button"
            onClick={startNewChat}
            className="text-sm text-amber-700 hover:underline"
          >
            新對話
          </button>
        </div>
        <h1 className="text-lg font-semibold text-amber-900">小明老師</h1>
        <Link to="/" className="text-sm text-amber-700 hover:underline">
          首頁
        </Link>
      </header>

      {showHistory ? (
        <div className="flex-1 overflow-auto p-4">
          <h2 className="font-medium text-amber-900 mb-3">對話歷史</h2>
          <ul className="space-y-2">
            {conversations.length === 0 && (
              <li className="text-amber-700/80 text-sm">尚無對話記錄</li>
            )}
            {conversations.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadConversation(c.id)}
                  className="flex-1 min-w-0 text-left px-4 py-2 rounded-xl bg-white border border-amber-100 hover:bg-amber-50"
                >
                  {c.title || '新對話'} · {new Date(c.updated_at).toLocaleDateString('zh-TW')}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteConversation(c.id)
                  }}
                  className="p-2 rounded-lg hover:bg-red-100 text-red-600 shrink-0"
                  aria-label="刪除此對話"
                >
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-amber-800/80 py-8">
                <p>你好！我是小明老師，你的中文學習助手。</p>
                <p className="mt-2 text-sm">可以問我字詞意思、造句，或課文相關問題。</p>
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                    m.role === 'user'
                      ? 'bg-amber-500 text-white'
                      : 'bg-white border border-amber-100 text-amber-900'
                  }`}
                >
                  {m.content || (m.role === 'assistant' && streaming ? '…' : '')}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="p-4 bg-white border-t border-amber-100">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                sendMessage()
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="輸入訊息…"
                className="flex-1 px-4 py-3 rounded-xl border border-amber-200 focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                disabled={streaming}
              />
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                className="px-5 py-3 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-50"
              >
                送出
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}

function HistoryIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}
