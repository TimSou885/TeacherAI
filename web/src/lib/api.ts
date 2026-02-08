const rawApiUrl = (import.meta.env.VITE_API_URL ?? '').trim()
export const API_URL = rawApiUrl && !/^https?:\/\//i.test(rawApiUrl)
  ? `https://${rawApiUrl.replace(/^\/+/, '')}`
  : rawApiUrl

const STUDENT_STORAGE_KEY = 'eduspark_student'

export type StudentSession = {
  token: string
  student: { id: string; name: string; classId: string; gradeLevel: number }
}

export function getStudentSession(): StudentSession | null {
  try {
    const raw = localStorage.getItem(STUDENT_STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as StudentSession
    if (!data?.token || !data?.student?.id) return null
    return data
  } catch {
    return null
  }
}

export function setStudentSession(session: StudentSession): void {
  localStorage.setItem(STUDENT_STORAGE_KEY, JSON.stringify(session))
}

export function clearStudentSession(): void {
  localStorage.removeItem(STUDENT_STORAGE_KEY)
}

async function getToken(): Promise<string | null> {
  const { data: { session } } = await import('../lib/supabase').then(m => m.supabase.auth.getSession())
  if (session?.access_token) return session.access_token
  const student = getStudentSession()
  return student?.token ?? null
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getToken()
  const url = path.startsWith('http') ? path : `${API_URL}${path}`
  const headers = new Headers(init?.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  headers.set('Content-Type', 'application/json')
  return fetch(url, { ...init, headers })
}

export async function apiChatStream(
  body: { conversationId?: string; message: string; subject?: string },
  onChunk: (text: string) => void,
  onDone?: (conversationId: string) => void
): Promise<void> {
  const token = await getToken()
  // #region agent log
  fetch('http://127.0.0.1:7246/ingest/ce4da3a2-50de-4590-a46a-3e3626a1067e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:apiChatStream',message:'before chat request',data:{hasToken:!!token,tokenLength:token?.length ?? 0,apiUrl:API_URL || '(empty)'},timestamp:Date.now(),hypothesisId:'H1_H2'})}).catch(()=>{});
  // #endregion
  const url = `${API_URL}/api/chat`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string; detail?: string }
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/ce4da3a2-50de-4590-a46a-3e3626a1067e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:chatError',message:'chat API error response',data:{status:res.status,message:err?.message,detail:err?.detail},timestamp:Date.now(),hypothesisId:'H3_H4_H5'})}).catch(()=>{});
    // #endregion
    throw new Error(err?.message ?? `HTTP ${res.status}`)
  }
  // #region agent log
  const resBody = res.body
  const bodyHasGetReader = resBody && typeof (resBody as { getReader?: unknown }).getReader === 'function'
  fetch('http://127.0.0.1:7246/ingest/ce4da3a2-50de-4590-a46a-3e3626a1067e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:beforeGetReader',message:'response body check',data:{hasBody:!!resBody,bodyHasGetReader,ok:res.ok},timestamp:Date.now(),hypothesisId:'frontendStream'})}).catch(()=>{});
  // #endregion
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  try {
    reader = res.body?.getReader() ?? null
  } catch (e) {
    const err = e as Error
    fetch('http://127.0.0.1:7246/ingest/ce4da3a2-50de-4590-a46a-3e3626a1067e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:getReaderThrow',message:'getReader failed',data:{errorMessage:err?.message},timestamp:Date.now(),hypothesisId:'frontendStream'})}).catch(()=>{});
    throw e
  }
  if (!reader) throw new Error('No response body')
  const decoder = new TextDecoder()
  let conversationId = ''
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lineEnd = buffer.indexOf('\n')
    if (lineEnd === -1) continue
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') continue
      try {
        const parsed = JSON.parse(data) as { conversationId?: string; content?: string }
        if (parsed.conversationId) conversationId = parsed.conversationId
        if (parsed.content) onChunk(parsed.content)
      } catch {
        // ignore parse error for partial or malformed
      }
    }
  }
  if (buffer.startsWith('data: ')) {
    try {
      const data = buffer.slice(6).trim()
      if (data !== '[DONE]') {
        const parsed = JSON.parse(data) as { conversationId?: string; content?: string }
        if (parsed.conversationId) conversationId = parsed.conversationId
        if (parsed.content) onChunk(parsed.content)
      }
    } catch {
      // ignore
    }
  }
  if (onDone && conversationId) onDone(conversationId)
}
