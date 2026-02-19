const rawApiUrl = (import.meta.env.VITE_API_URL ?? '').trim()
const fromEnv = rawApiUrl && !/^https?:\/\//i.test(rawApiUrl)
  ? `https://${rawApiUrl.replace(/^\/+/, '')}`
  : rawApiUrl
// 開發時若未設定 VITE_API_URL，直接連 localhost:8787，避免經 Vite proxy 時發生 401
export const API_URL = fromEnv || (import.meta.env.DEV ? 'http://localhost:8787' : '')

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
    if (!isStudentToken(data.token)) {
      clearStudentSession()
      return null
    }
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

const STUDENT_JWT_ISSUER = 'eduspark-student'

/** 不解簽，只解 payload 取 issuer（除錯用） */
export function getJwtIssuer(token: string | null | undefined): string | null {
  if (!token) return null
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as { iss?: string }
    return payload.iss ?? null
  } catch {
    return null
  }
}

/** 不解簽，只解 payload 檢查 issuer，避免把老師 token 當學生用 */
export function isStudentToken(token: string | null | undefined): boolean {
  return getJwtIssuer(token) === STUDENT_JWT_ISSUER
}

/** 學生情境（如 /student/home、測驗交卷）下傳 true，只帶學生 token，絕不帶老師 token */
async function getToken(preferStudent?: boolean): Promise<string | null> {
  if (preferStudent) {
    const student = getStudentSession()
    return student?.token ?? null
  }
  const { data: { session } } = await import('../lib/supabase').then(m => m.supabase.auth.getSession())
  if (session?.access_token) return session.access_token
  const student = getStudentSession()
  return student?.token ?? null
}

/** 僅回傳 Supabase 老師 session token（不 fallback 學生），供教師 API 使用 */
export async function getTeacherToken(): Promise<string | null> {
  const { data: { session } } = await import('../lib/supabase').then(m => m.supabase.auth.getSession())
  return session?.access_token ?? null
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
  options?: { preferStudent?: boolean; /** 教師 API 專用，僅用 Supabase token，不用學生 token */ preferTeacher?: boolean; /** 若提供則強制使用此 token（用於交卷等必須為學生 token 的請求） */ token?: string | null }
): Promise<Response> {
  const useExplicit = options?.token !== undefined
  const token = useExplicit
    ? options.token
    : options?.preferTeacher
      ? await getTeacherToken()
      : await getToken(options?.preferStudent)
  const url = path.startsWith('http') ? path : `${API_URL}${path}`
  const headers = new Headers(init?.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  headers.set('Content-Type', 'application/json')
  return fetch(url, { ...init, headers })
}

export async function apiChatStream(
  body: { conversationId?: string; message: string; subject?: string },
  onChunk: (text: string) => void,
  onDone?: (conversationId: string) => void,
  options?: { preferStudent?: boolean }
): Promise<void> {
  const token = await getToken(options?.preferStudent)
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
    throw new Error(err?.message ?? `HTTP ${res.status}`)
  }
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  try {
    reader = res.body?.getReader() ?? null
  } catch (e) {
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

/** 取得 TTS 播放 URL（POST /api/tts）。回傳可作為 <audio src> 的 URL（含 R2 或 blob）。 */
export async function getTtsUrl(
  text: string,
  options?: { preferStudent?: boolean; speed?: 'slow' | 'medium' }
): Promise<string> {
  if (!API_URL) {
    throw new Error('未設定 API 網址（正式環境請在 Cloudflare Pages 設定 VITE_API_URL 為 Workers 網址）')
  }
  const token = await getToken(options?.preferStudent)
  const url = `${API_URL}/api/tts`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ text: text.trim(), speed: options?.speed ?? 'medium' }),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string }
    const msg = err?.message ?? `TTS ${res.status}`
    console.error('[TTS]', res.status, msg)
    throw new Error(msg)
  }
  const contentType = res.headers.get('Content-Type') ?? ''
  if (contentType.includes('application/json')) {
    const data = (await res.json()) as { url?: string }
    if (!data?.url) throw new Error('TTS returned no url')
    return data.url.startsWith('http') ? data.url : `${API_URL.replace(/\/$/, '')}${data.url.startsWith('/') ? '' : '/'}${data.url}`
  }
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}
