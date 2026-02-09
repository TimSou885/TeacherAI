export function supabaseFetch(
  url: string,
  serviceKey: string,
  options: { method?: string; body?: string; headers?: Record<string, string> } = {}
) {
  const { method = 'GET', body, headers = {} } = options
  return fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      apikey: serviceKey,
      ...headers,
    },
    body,
  })
}

export async function createConversation(
  baseUrl: string,
  serviceKey: string,
  payload: { subject?: string; mode?: string; student_id?: string | null }
) {
  const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/conversations`
  const res = await supabaseFetch(url, serviceKey, {
    method: 'POST',
    body: JSON.stringify({
      subject: payload.subject ?? 'chinese',
      mode: payload.mode ?? 'chat',
      ...(payload.student_id != null ? { student_id: payload.student_id } : {}),
    }),
    headers: { Prefer: 'return=representation' },
  })
  if (!res.ok) throw new Error(`Supabase: ${await res.text()}`)
  const data = (await res.json()) as Array<{ id: string }>
  return data[0].id
}

export async function createMessage(
  baseUrl: string,
  serviceKey: string,
  payload: { conversation_id: string; role: string; content: string }
) {
  const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/messages`
  const res = await supabaseFetch(url, serviceKey, {
    method: 'POST',
    body: JSON.stringify({
      conversation_id: payload.conversation_id,
      role: payload.role,
      content: payload.content,
    }),
    headers: { Prefer: 'return=representation' },
  })
  if (!res.ok) throw new Error(`Supabase: ${await res.text()}`)
  const data = (await res.json()) as Array<{ id: string }>
  return data[0].id
}

export async function listConversations(
  baseUrl: string,
  serviceKey: string,
  options?: { student_id?: string; teacher_only?: boolean }
) {
  let url = `${baseUrl.replace(/\/$/, '')}/rest/v1/conversations?order=updated_at.desc&select=id,title,updated_at`
  if (options?.student_id) {
    url += `&student_id=eq.${options.student_id}`
  } else if (options?.teacher_only) {
    url += `&student_id=is.null`
  }
  const res = await supabaseFetch(url, serviceKey)
  if (!res.ok) throw new Error(`Supabase: ${await res.text()}`)
  return (await res.json()) as Array<{ id: string; title: string | null; updated_at: string }>
}

/** 取得單一對話的 student_id（用於權限檢查） */
export async function getConversationStudentId(
  baseUrl: string,
  serviceKey: string,
  conversationId: string
): Promise<string | null> {
  const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/conversations?id=eq.${conversationId}&select=student_id`
  const res = await supabaseFetch(url, serviceKey)
  if (!res.ok) throw new Error(`Supabase: ${await res.text()}`)
  const rows = (await res.json()) as Array<{ student_id: string | null }>
  return rows.length > 0 ? rows[0].student_id ?? null : null
}

export async function getConversationMessages(
  baseUrl: string,
  serviceKey: string,
  conversationId: string
) {
  const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/messages?conversation_id=eq.${conversationId}&order=created_at.asc&select=id,role,content`
  const res = await supabaseFetch(url, serviceKey)
  if (!res.ok) throw new Error(`Supabase: ${await res.text()}`)
  return (await res.json()) as Array<{ id: string; role: string; content: string }>
}

export async function updateConversationUpdatedAt(
  baseUrl: string,
  serviceKey: string,
  conversationId: string
) {
  const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/conversations?id=eq.${conversationId}`
  await supabaseFetch(url, serviceKey, {
    method: 'PATCH',
    body: JSON.stringify({ updated_at: new Date().toISOString() }),
  })
}

export async function updateConversationTitle(
  baseUrl: string,
  serviceKey: string,
  conversationId: string,
  title: string
) {
  const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/conversations?id=eq.${conversationId}`
  const res = await supabaseFetch(url, serviceKey, {
    method: 'PATCH',
    body: JSON.stringify({ title: title.trim().slice(0, 200) }),
  })
  if (!res.ok) throw new Error(`Supabase: ${await res.text()}`)
}

/** 刪除一則對話（messages 有 ON DELETE CASCADE，會一併刪除） */
export async function deleteConversation(
  baseUrl: string,
  serviceKey: string,
  conversationId: string
) {
  const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/conversations?id=eq.${conversationId}`
  const res = await supabaseFetch(url, serviceKey, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Supabase: ${await res.text()}`)
}

/** 依班級代碼查詢班級與學生名單（學生登入用，不需認證） */
export async function getClassByJoinCode(
  baseUrl: string,
  serviceKey: string,
  joinCode: string
): Promise<{
  classId: string
  className: string
  students: Array<{ id: string; name: string; display_name: string | null; grade_level: number | null }>
} | null> {
  const code = joinCode.trim().toUpperCase()
  if (!code) return null
  const classUrl = `${baseUrl.replace(/\/$/, '')}/rest/v1/classes?join_code=eq.${encodeURIComponent(code)}&select=id,name`
  const classRes = await supabaseFetch(classUrl, serviceKey)
  if (!classRes.ok) throw new Error(`Supabase: ${await classRes.text()}`)
  const classes = (await classRes.json()) as Array<{ id: string; name: string }>
  if (classes.length === 0) return null
  const classId = classes[0].id
  const className = classes[0].name
  const studentsUrl = `${baseUrl.replace(/\/$/, '')}/rest/v1/students?class_id=eq.${classId}&select=id,name,display_name,grade_level&order=name.asc`
  const studentsRes = await supabaseFetch(studentsUrl, serviceKey)
  if (!studentsRes.ok) throw new Error(`Supabase: ${await studentsRes.text()}`)
  const students = (await studentsRes.json()) as Array<{
    id: string
    name: string
    display_name: string | null
    grade_level: number | null
  }>
  return { classId, className, students }
}

/** 驗證學生屬於該班級（依班級代碼 + 學生 ID） */
export async function getStudentInClass(
  baseUrl: string,
  serviceKey: string,
  joinCode: string,
  studentId: string
): Promise<{
  id: string
  name: string
  display_name: string | null
  grade_level: number | null
  class_id: string
  school_id: string | null
} | null> {
  const code = joinCode.trim().toUpperCase()
  if (!code || !studentId) return null
  const classUrl = `${baseUrl.replace(/\/$/, '')}/rest/v1/classes?join_code=eq.${encodeURIComponent(code)}&select=id`
  const classRes = await supabaseFetch(classUrl, serviceKey)
  if (!classRes.ok) throw new Error(`Supabase: ${await classRes.text()}`)
  const classes = (await classRes.json()) as Array<{ id: string }>
  if (classes.length === 0) return null
  const classId = classes[0].id
  const studentUrl = `${baseUrl.replace(/\/$/, '')}/rest/v1/students?id=eq.${studentId}&class_id=eq.${classId}&select=id,name,display_name,grade_level,class_id,school_id`
  const studentRes = await supabaseFetch(studentUrl, serviceKey)
  if (!studentRes.ok) throw new Error(`Supabase: ${await studentRes.text()}`)
  const rows = (await studentRes.json()) as Array<{
    id: string
    name: string
    display_name: string | null
    grade_level: number | null
    class_id: string
    school_id: string | null
  }>
  return rows.length > 0 ? rows[0] : null
}

/** 依 class_id 列出練習（可選 category，如 dictation） */
export async function listExercises(
  baseUrl: string,
  serviceKey: string,
  classId: string,
  options?: { category?: string }
) {
  let url = `${baseUrl.replace(/\/$/, '')}/rest/v1/exercises?class_id=eq.${classId}&is_active=eq.true&order=created_at.desc&select=id,title,category,grade_level,created_at`
  if (options?.category) {
    url += `&category=eq.${encodeURIComponent(options.category)}`
  }
  const res = await supabaseFetch(url, serviceKey)
  if (!res.ok) throw new Error(`Supabase: ${await res.text()}`)
  return (await res.json()) as Array<{
    id: string
    title: string
    category: string
    grade_level: number | null
    created_at: string
  }>
}

/** 取得單一練習（含 questions） */
export async function getExerciseById(
  baseUrl: string,
  serviceKey: string,
  exerciseId: string
): Promise<{
  id: string
  class_id: string
  title: string
  category: string
  questions: unknown
  grade_level: number | null
} | null> {
  const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/exercises?id=eq.${exerciseId}&select=id,class_id,title,category,questions,grade_level`
  const res = await supabaseFetch(url, serviceKey)
  if (!res.ok) throw new Error(`Supabase: ${await res.text()}`)
  const rows = (await res.json()) as Array<{
    id: string
    class_id: string
    title: string
    category: string
    questions: unknown
    grade_level: number | null
  }>
  return rows.length > 0 ? rows[0] : null
}

/** 寫入練習作答記錄 */
export async function insertExerciseAttempt(
  baseUrl: string,
  serviceKey: string,
  payload: {
    exercise_id: string
    student_id: string
    answers: unknown
    score: number
    total_questions: number
    correct_count: number
  }
) {
  const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/exercise_attempts`
  const res = await supabaseFetch(url, serviceKey, {
    method: 'POST',
    body: JSON.stringify({
      exercise_id: payload.exercise_id,
      student_id: payload.student_id,
      answers: payload.answers,
      score: payload.score,
      total_questions: payload.total_questions,
      correct_count: payload.correct_count,
    }),
    headers: { Prefer: 'return=minimal' },
  })
  if (!res.ok) throw new Error(`Supabase: ${await res.text()}`)
}

/** 寫入 embeddings_log（RAG 嵌入追蹤） */
export async function createEmbeddingLog(
  baseUrl: string,
  serviceKey: string,
  payload: {
    content_type: string
    content_id?: string | null
    class_id?: string | null
    subject?: string
    content_text: string
    vector_id: string
  }
) {
  const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/embeddings_log`
  const res = await supabaseFetch(url, serviceKey, {
    method: 'POST',
    body: JSON.stringify({
      content_type: payload.content_type,
      content_id: payload.content_id ?? null,
      class_id: payload.class_id ?? null,
      subject: payload.subject ?? 'chinese',
      content_text: payload.content_text.slice(0, 10000),
      vector_id: payload.vector_id,
    }),
    headers: { Prefer: 'return=minimal' },
  })
  if (!res.ok) throw new Error(`Supabase: ${await res.text()}`)
}
