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

/** 依 teacher_id 列出班級（含 teacher_id 為 null 的未認領班級，供老師認領；UUID 以小寫比對） */
export async function listClassesByTeacher(
  baseUrl: string,
  serviceKey: string,
  teacherId: string
) {
  const base = baseUrl.replace(/\/$/, '')
  const tid = (teacherId ?? '').toLowerCase()
  const orFilter = tid ? `or=(teacher_id.eq.${tid},teacher_id.is.null)` : `teacher_id=is.null`
  const url = `${base}/rest/v1/classes?${orFilter}&select=id,name,join_code&order=name.asc`
  const res = await supabaseFetch(url, serviceKey)
  if (!res.ok) throw new Error(`Supabase: ${await res.text()}`)
  return (await res.json()) as Array<{ id: string; name: string; join_code: string }>
}

/** 老師認領班級（僅當 teacher_id 為 null 時寫入） */
export async function claimClassForTeacher(
  baseUrl: string,
  serviceKey: string,
  classId: string,
  teacherId: string
): Promise<'claimed' | 'already_owned' | 'owned_by_other'> {
  const base = baseUrl.replace(/\/$/, '')
  const getUrl = `${base}/rest/v1/classes?id=eq.${classId}&select=id,teacher_id`
  const res = await supabaseFetch(getUrl, serviceKey)
  if (!res.ok) return 'owned_by_other'
  const rows = (await res.json()) as Array<{ id: string; teacher_id: string | null }>
  if (rows.length === 0) return 'owned_by_other'
  const current = rows[0]!.teacher_id
  if (current != null && (current.trim().toLowerCase() === (teacherId ?? '').trim().toLowerCase())) return 'already_owned'
  if (current !== null) return 'owned_by_other'
  const patchUrl = `${base}/rest/v1/classes?id=eq.${classId}`
  const patchRes = await supabaseFetch(patchUrl, serviceKey, {
    method: 'PATCH',
    body: JSON.stringify({ teacher_id: teacherId }),
    headers: { Prefer: 'return=minimal' },
  })
  return patchRes.ok ? 'claimed' : 'owned_by_other'
}

/** 確認教師是否擁有該班級（UUID 比對不區分大小寫） */
export async function verifyTeacherOwnsClass(
  baseUrl: string,
  serviceKey: string,
  classId: string,
  teacherId: string
): Promise<boolean> {
  const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/classes?id=eq.${classId}&select=id,teacher_id`
  const res = await supabaseFetch(url, serviceKey)
  if (!res.ok) return false
  const rows = (await res.json()) as Array<{ id: string; teacher_id: string | null }>
  const row = rows[0]
  if (!row) return false
  const a = (row.teacher_id ?? '').trim().toLowerCase()
  const b = (teacherId ?? '').trim().toLowerCase()
  return a.length > 0 && a === b
}

/** 依 class_id 列出學生 */
export async function listStudentsByClassId(
  baseUrl: string,
  serviceKey: string,
  classId: string
) {
  const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/students?class_id=eq.${classId}&select=id,name,display_name,grade_level&order=name.asc`
  const res = await supabaseFetch(url, serviceKey)
  if (!res.ok) throw new Error(`Supabase: ${await res.text()}`)
  return (await res.json()) as Array<{
    id: string
    name: string
    display_name: string | null
    grade_level: number | null
  }>
}

/** 班級儀表板統計（今日活躍人數、學生數、練習數、待複習錯題數） */
export async function getClassDashboardStats(
  baseUrl: string,
  serviceKey: string,
  classId: string
): Promise<{
  studentCount: number
  exerciseCount: number
  todayActiveCount: number
  errorBookUnresolvedCount: number
}> {
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const todayIso = todayStart.toISOString()

  const [studentsRes, exercisesRes] = await Promise.all([
    supabaseFetch(
      `${baseUrl.replace(/\/$/, '')}/rest/v1/students?class_id=eq.${classId}&select=id`,
      serviceKey
    ),
    supabaseFetch(
      `${baseUrl.replace(/\/$/, '')}/rest/v1/exercises?class_id=eq.${classId}&is_active=eq.true&select=id`,
      serviceKey
    ),
  ])
  const students = (await studentsRes.json()) as Array<{ id: string }>
  const exercises = (await exercisesRes.json()) as Array<{ id: string }>
  const exerciseIds = exercises.map((e) => e.id)
  const studentCount = students.length
  const exerciseCount = exerciseIds.length

  let todayActiveCount = 0
  let errorBookUnresolvedCount = 0

  if (exerciseIds.length > 0) {
    const attemptsUrl = `${baseUrl.replace(/\/$/, '')}/rest/v1/exercise_attempts?or=(${exerciseIds.map((id) => `exercise_id.eq.${id}`).join(',')})&completed_at=gte.${todayIso}&select=student_id`
    const attemptsRes = await supabaseFetch(attemptsUrl, serviceKey)
    if (attemptsRes.ok) {
      const attempts = (await attemptsRes.json()) as Array<{ student_id: string }>
      todayActiveCount = new Set(attempts.map((a) => a.student_id)).size
    }

    const errUrl = `${baseUrl.replace(/\/$/, '')}/rest/v1/error_book?is_resolved=eq.false&or=(${exerciseIds.map((id) => `exercise_id.eq.${id}`).join(',')})&select=id`
    const errRes = await supabaseFetch(errUrl, serviceKey)
    if (errRes.ok) {
      const errRows = (await errRes.json()) as Array<{ id: string }>
      errorBookUnresolvedCount = errRows.length
    }
  }

  return {
    studentCount,
    exerciseCount,
    todayActiveCount,
    errorBookUnresolvedCount,
  }
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

/** 寫入或更新錯題本（答錯時呼叫，同題重錯則重置 correct_count） */
export async function upsertErrorBook(
  baseUrl: string,
  serviceKey: string,
  payload: {
    student_id: string
    exercise_id: string
    subject: string
    category: string
    question_index: number
    error_content: Record<string, unknown>
  }
) {
  const base = baseUrl.replace(/\/$/, '')
  const url = `${base}/rest/v1/error_book?on_conflict=student_id,exercise_id,question_index`
  const body = {
    student_id: payload.student_id,
    exercise_id: payload.exercise_id,
    subject: payload.subject ?? 'chinese',
    category: payload.category,
    question_index: payload.question_index,
    error_content: payload.error_content,
    correct_count: 0,
    is_resolved: false,
    last_practiced_at: new Date().toISOString(),
  }
  const res = await supabaseFetch(url, serviceKey, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      Prefer: 'resolution=merge-duplicates',
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase error_book: ${text}`)
  }
}

/** 取得學生錯題摘要（供 AI 主動引導練習，最多 5 條） */
export async function getErrorBookSummaryForStudent(
  baseUrl: string,
  serviceKey: string,
  studentId: string
): Promise<string> {
  const items = await listErrorBookItems(baseUrl, serviceKey, studentId, { limit: 5 })
  if (items.length === 0) return ''
  return items
    .map((i) => {
      const ec = i.error_content
      const q = ec?.question ?? ec?.word ?? ''
      return `- ${String(q).slice(0, 40)}${String(q).length > 40 ? '…' : ''}（${i.category}）`
    })
    .join('\n')
}

/** 查詢學生的待複習錯題（is_resolved = false） */
export async function listErrorBookItems(
  baseUrl: string,
  serviceKey: string,
  studentId: string,
  options?: { limit?: number }
) {
  const limit = options?.limit ?? 20
  const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/error_book?student_id=eq.${studentId}&is_resolved=eq.false&order=last_practiced_at.desc.nullsfirst,created_at.desc&limit=${limit}&select=id,exercise_id,category,question_index,error_content,correct_count,last_practiced_at,created_at`
  const res = await supabaseFetch(url, serviceKey)
  if (!res.ok) throw new Error(`Supabase: ${await res.text()}`)
  return (await res.json()) as Array<{
    id: string
    exercise_id: string
    category: string
    question_index: number
    error_content: Record<string, unknown>
    correct_count: number
    last_practiced_at: string | null
    created_at: string
  }>
}

/** 記錄錯題複習結果：答對則 correct_count+1，達 3 次設 is_resolved；答錯則 correct_count 歸零 */
export async function updateErrorBookPractice(
  baseUrl: string,
  serviceKey: string,
  id: string,
  isCorrect: boolean,
  studentId?: string
) {
  const base = baseUrl.replace(/\/$/, '')
  const getUrl = `${base}/rest/v1/error_book?id=eq.${id}&select=correct_count,student_id`
  const getRes = await supabaseFetch(getUrl, serviceKey)
  if (!getRes.ok) throw new Error(`Supabase: ${await getRes.text()}`)
  const rows = (await getRes.json()) as Array<{ correct_count: number; student_id: string }>
  if (rows.length === 0) throw new Error('error_book not found')
  if (studentId && rows[0].student_id !== studentId) throw new Error('forbidden')

  const current = rows[0].correct_count
  const nextCount = isCorrect ? current + 1 : 0
  const patch: Record<string, unknown> = {
    correct_count: nextCount,
    last_practiced_at: new Date().toISOString(),
  }
  if (nextCount >= 3) {
    patch.is_resolved = true
  }

  const patchUrl = `${base}/rest/v1/error_book?id=eq.${id}`
  const patchRes = await supabaseFetch(patchUrl, serviceKey, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  if (!patchRes.ok) throw new Error(`Supabase: ${await patchRes.text()}`)
}

/** 取得練習中某題的完整題目（用於錯題複習） */
export async function getExerciseQuestionByIndex(
  baseUrl: string,
  serviceKey: string,
  exerciseId: string,
  questionIndex: number
): Promise<unknown | null> {
  const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/exercises?id=eq.${exerciseId}&select=questions`
  const res = await supabaseFetch(url, serviceKey)
  if (!res.ok) throw new Error(`Supabase: ${await res.text()}`)
  const rows = (await res.json()) as Array<{ questions: unknown[] }>
  if (rows.length === 0) return null
  const questions = rows[0].questions
  if (!Array.isArray(questions) || questionIndex < 0 || questionIndex >= questions.length) {
    return null
  }
  return questions[questionIndex]
}

/** 建立練習（發佈 AI 出題用） */
export async function insertExercise(
  baseUrl: string,
  serviceKey: string,
  payload: {
    class_id: string
    subject?: string
    title: string
    category: string
    questions: unknown
    grade_level?: number
    is_active?: boolean
  }
): Promise<string> {
  const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/exercises`
  const res = await supabaseFetch(url, serviceKey, {
    method: 'POST',
    body: JSON.stringify({
      class_id: payload.class_id,
      subject: payload.subject ?? 'chinese',
      title: payload.title,
      category: payload.category,
      questions: payload.questions,
      grade_level: payload.grade_level ?? 3,
      is_active: payload.is_active ?? true,
    }),
    headers: { Prefer: 'return=representation' },
  })
  if (!res.ok) throw new Error(`Supabase: ${await res.text()}`)
  const rows = (await res.json()) as Array<{ id: string }>
  return rows[0]?.id ?? ''
}

/** 建立 AI 生成內容草稿 */
export async function createAiGeneratedContent(
  baseUrl: string,
  serviceKey: string,
  payload: {
    class_id: string
    subject?: string
    category: string
    source_text?: string | null
    generated_content: unknown
    teacher_id?: string | null
  }
): Promise<string> {
  const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/ai_generated_content`
  const res = await supabaseFetch(url, serviceKey, {
    method: 'POST',
    body: JSON.stringify({
      class_id: payload.class_id,
      subject: payload.subject ?? 'chinese',
      category: payload.category,
      source_text: payload.source_text ?? null,
      generated_content: payload.generated_content,
      status: 'draft',
      teacher_id: payload.teacher_id ?? null,
    }),
    headers: { Prefer: 'return=representation' },
  })
  if (!res.ok) throw new Error(`Supabase: ${await res.text()}`)
  const rows = (await res.json()) as Array<{ id: string }>
  return rows[0]?.id ?? ''
}

/** 更新 AI 生成內容（審核後發佈時） */
export async function updateAiGeneratedContent(
  baseUrl: string,
  serviceKey: string,
  id: string,
  patch: { status?: string; approved_content?: unknown; approved_at?: string }
) {
  const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/ai_generated_content?id=eq.${id}`
  const res = await supabaseFetch(url, serviceKey, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(`Supabase: ${await res.text()}`)
}

/** 取得單一 AI 生成內容 */
export async function getAiGeneratedContentById(
  baseUrl: string,
  serviceKey: string,
  id: string
): Promise<{
  id: string
  class_id: string
  category: string
  source_text: string | null
  generated_content: unknown
  status: string
  approved_content: unknown
} | null> {
  const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/ai_generated_content?id=eq.${id}&select=id,class_id,category,source_text,generated_content,status,approved_content`
  const res = await supabaseFetch(url, serviceKey)
  if (!res.ok) throw new Error(`Supabase: ${await res.text()}`)
  const rows = (await res.json()) as Array<{
    id: string
    class_id: string
    category: string
    source_text: string | null
    generated_content: unknown
    status: string
    approved_content: unknown
  }>
  return rows[0] ?? null
}

/** 查詢班級錯題摘要（供「根據錯題出複習題」注入 AI prompt） */
export async function getClassErrorBookSummary(
  baseUrl: string,
  serviceKey: string,
  classId: string
): Promise<string> {
  const exUrl = `${baseUrl.replace(/\/$/, '')}/rest/v1/exercises?class_id=eq.${classId}&select=id`
  const exRes = await supabaseFetch(exUrl, serviceKey)
  if (!exRes.ok) return ''
  const exercises = (await exRes.json()) as Array<{ id: string }>
  const exerciseIds = exercises.map((e) => e.id)
  if (exerciseIds.length === 0) return '班上目前無練習，也無錯題。'
  const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/error_book?is_resolved=eq.false&exercise_id=in.(${exerciseIds.join(',')})&select=exercise_id,category,error_content`
  const res = await supabaseFetch(url, serviceKey)
  if (!res.ok) return ''
  const rows = (await res.json()) as Array<{
    exercise_id: string
    category: string
    error_content: Record<string, unknown>
  }>
  const byCategory = new Map<string, Map<string, number>>()
  for (const row of rows) {
    const cat = row.category || 'quiz'
    const q = row.error_content?.question ?? row.error_content?.word ?? JSON.stringify(row.error_content)
    const key = String(q).slice(0, 60)
    if (!byCategory.has(cat)) byCategory.set(cat, new Map())
    const m = byCategory.get(cat)!
    m.set(key, (m.get(key) ?? 0) + 1)
  }
  const lines: string[] = []
  for (const [cat, m] of byCategory) {
    const top = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    lines.push(`【${cat}】${top.map(([k, n]) => `「${k}」錯了 ${n} 人`).join('；')}`)
  }
  return lines.join('\n') || '班上目前無待複習錯題。'
}

/** 班級弱項分析：依範疇統計待複習錯題數、高頻錯題 TOP5、供 AI 的摘要 */
export async function getClassWeaknessStats(
  baseUrl: string,
  serviceKey: string,
  classId: string
): Promise<{
  categoryStats: Array<{ category: string; unresolvedCount: number }>
  topErrors: Array<{ text: string; count: number; category: string }>
  summaryForAi: string
}> {
  const exUrl = `${baseUrl.replace(/\/$/, '')}/rest/v1/exercises?class_id=eq.${classId}&select=id`
  const exRes = await supabaseFetch(exUrl, serviceKey)
  if (!exRes.ok) {
    return { categoryStats: [], topErrors: [], summaryForAi: '' }
  }
  const exercises = (await exRes.json()) as Array<{ id: string }>
  const exerciseIds = exercises.map((e) => e.id)
  const allCategories = ['reading', 'grammar', 'vocabulary', 'dictation', 'reorder']
  const categoryCounts = new Map<string, number>(allCategories.map((c) => [c, 0]))
  const errorKeyToMeta = new Map<string, { count: number; category: string }>()
  const lines: string[] = []

  if (exerciseIds.length === 0) {
    return {
      categoryStats: allCategories.map((category) => ({ category, unresolvedCount: 0 })),
      topErrors: [],
      summaryForAi: '班上目前無練習，也無錯題。',
    }
  }

  const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/error_book?is_resolved=eq.false&exercise_id=in.(${exerciseIds.join(',')})&select=exercise_id,category,error_content`
  const res = await supabaseFetch(url, serviceKey)
  if (!res.ok) {
    return {
      categoryStats: allCategories.map((category) => ({ category, unresolvedCount: 0 })),
      topErrors: [],
      summaryForAi: '',
    }
  }
  const rows = (await res.json()) as Array<{
    exercise_id: string
    category: string
    error_content: Record<string, unknown>
  }>

  for (const row of rows) {
    const cat = row.category || 'quiz'
    if (categoryCounts.has(cat)) {
      categoryCounts.set(cat, categoryCounts.get(cat)! + 1)
    }
    const q = row.error_content?.question ?? row.error_content?.word ?? JSON.stringify(row.error_content)
    const key = String(q).slice(0, 80)
    const prev = errorKeyToMeta.get(key)
    if (prev) {
      prev.count += 1
    } else {
      errorKeyToMeta.set(key, { count: 1, category: cat })
    }
  }

  const categoryStats = allCategories.map((category) => ({
    category,
    unresolvedCount: categoryCounts.get(category) ?? 0,
  }))
  // 其他範疇（如 quiz、error_review）也列入，合併到 categoryStats 時只取 allCategories，但 topErrors 可含任何 category
  const sortedErrors = [...errorKeyToMeta.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
  const topErrors = sortedErrors.map(([text, meta]) => ({
    text,
    count: meta.count,
    category: meta.category,
  }))

  for (const cat of categoryCounts.keys()) {
    const m = new Map<string, number>()
    for (const row of rows) {
      if (row.category !== cat) continue
      const q = row.error_content?.question ?? row.error_content?.word ?? JSON.stringify(row.error_content)
      const key = String(q).slice(0, 60)
      m.set(key, (m.get(key) ?? 0) + 1)
    }
    const top = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    if (top.length > 0) {
      lines.push(`【${cat}】${top.map(([k, n]) => `「${k}」錯了 ${n} 次`).join('；')}`)
    }
  }
  const summaryForAi = lines.length > 0 ? lines.join('\n') : '班上目前無待複習錯題。'

  return { categoryStats, topErrors, summaryForAi }
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

/** 即時課堂測驗：產生 6 碼代碼（大寫英數） */
function generateLiveCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

/** 建立即時測驗場次（教師） */
export async function createLiveSession(
  baseUrl: string,
  serviceKey: string,
  payload: { class_id: string; teacher_id: string; exercise_id: string }
): Promise<{ id: string; code: string }> {
  const base = baseUrl.replace(/\/$/, '')
  let code = generateLiveCode()
  for (let attempt = 0; attempt < 10; attempt++) {
    const checkUrl = `${base}/rest/v1/live_sessions?code=eq.${code}&select=id`
    const checkRes = await supabaseFetch(checkUrl, serviceKey)
    if (checkRes.ok) {
      const existing = (await checkRes.json()) as Array<{ id: string }>
      if (existing.length === 0) break
    }
    code = generateLiveCode()
  }
  const url = `${base}/rest/v1/live_sessions`
  const res = await supabaseFetch(url, serviceKey, {
    method: 'POST',
    body: JSON.stringify({
      class_id: payload.class_id,
      teacher_id: payload.teacher_id,
      exercise_id: payload.exercise_id,
      code,
      status: 'waiting',
    }),
    headers: { Prefer: 'return=representation' },
  })
  if (!res.ok) throw new Error(`Supabase live_sessions: ${await res.text()}`)
  const rows = (await res.json()) as Array<{ id: string; code: string }>
  return { id: rows[0].id, code: rows[0].code }
}

/** 依 code 取得場次（含 exercise_id, class_id, status） */
export async function getLiveSessionByCode(
  baseUrl: string,
  serviceKey: string,
  code: string
): Promise<{
  id: string
  class_id: string
  exercise_id: string
  status: string
} | null> {
  const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/live_sessions?code=eq.${encodeURIComponent(code.trim().toUpperCase())}&select=id,class_id,exercise_id,status`
  const res = await supabaseFetch(url, serviceKey)
  if (!res.ok) return null
  const rows = (await res.json()) as Array<{ id: string; class_id: string; exercise_id: string; status: string }>
  return rows[0] ?? null
}

/** 學生加入即時場次（須為該班學生） */
export async function joinLiveSession(
  baseUrl: string,
  serviceKey: string,
  sessionId: string,
  studentId: string
): Promise<'ok' | 'already_joined' | 'wrong_class'> {
  const base = baseUrl.replace(/\/$/, '')
  const sessionUrl = `${base}/rest/v1/live_sessions?id=eq.${sessionId}&select=class_id,status`
  const sessionRes = await supabaseFetch(sessionUrl, serviceKey)
  if (!sessionRes.ok) return 'wrong_class'
  const sessions = (await sessionRes.json()) as Array<{ class_id: string; status: string }>
  const session = sessions[0]
  if (!session || session.status !== 'waiting') return 'wrong_class'
  const studentUrl = `${base}/rest/v1/students?id=eq.${studentId}&class_id=eq.${session.class_id}&select=id`
  const studentRes = await supabaseFetch(studentUrl, serviceKey)
  if (!studentRes.ok) return 'wrong_class'
  const students = (await studentRes.json()) as Array<{ id: string }>
  if (students.length === 0) return 'wrong_class'
  const insertUrl = `${base}/rest/v1/live_participants`
  const insertRes = await supabaseFetch(insertUrl, serviceKey, {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, student_id: studentId }),
    headers: { Prefer: 'return=minimal' },
  })
  if (insertRes.status === 409) return 'already_joined'
  if (!insertRes.ok) return 'wrong_class'
  return 'ok'
}

/** 取得場次詳情（含參與人數、teacher_id） */
export async function getLiveSessionById(
  baseUrl: string,
  serviceKey: string,
  sessionId: string
): Promise<{
  id: string
  class_id: string
  exercise_id: string
  code: string
  status: string
  teacher_id: string
  participant_count: number
} | null> {
  const base = baseUrl.replace(/\/$/, '')
  const sessionUrl = `${base}/rest/v1/live_sessions?id=eq.${sessionId}&select=id,class_id,exercise_id,code,status,teacher_id`
  const sessionRes = await supabaseFetch(sessionUrl, serviceKey)
  if (!sessionRes.ok) return null
  const sessions = (await sessionRes.json()) as Array<{ id: string; class_id: string; exercise_id: string; code: string; status: string; teacher_id: string }>
  const session = sessions[0]
  if (!session) return null
  const countUrl = `${base}/rest/v1/live_participants?session_id=eq.${sessionId}&select=id`
  const countRes = await supabaseFetch(countUrl, serviceKey)
  let participant_count = 0
  if (countRes.ok) {
    const rows = (await countRes.json()) as Array<{ id: string }>
    participant_count = rows.length
  }
  return { ...session, participant_count }
}

/** 更新場次狀態（教師） */
export async function updateLiveSessionStatus(
  baseUrl: string,
  serviceKey: string,
  sessionId: string,
  teacherId: string,
  status: 'started' | 'ended'
): Promise<boolean> {
  const base = baseUrl.replace(/\/$/, '')
  const checkUrl = `${base}/rest/v1/live_sessions?id=eq.${sessionId}&teacher_id=eq.${teacherId}&select=id`
  const checkRes = await supabaseFetch(checkUrl, serviceKey)
  if (!checkRes.ok) return false
  const rows = (await checkRes.json()) as Array<{ id: string }>
  if (rows.length === 0) return false
  const patchUrl = `${base}/rest/v1/live_sessions?id=eq.${sessionId}`
  const patchRes = await supabaseFetch(patchUrl, serviceKey, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    headers: { Prefer: 'return=minimal' },
  })
  return patchRes.ok
}
