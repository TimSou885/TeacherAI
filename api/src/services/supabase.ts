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
  payload: { subject?: string; mode?: string }
) {
  const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/conversations`
  const res = await supabaseFetch(url, serviceKey, {
    method: 'POST',
    body: JSON.stringify({
      subject: payload.subject ?? 'chinese',
      mode: payload.mode ?? 'chat',
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

export async function listConversations(baseUrl: string, serviceKey: string) {
  const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/conversations?order=updated_at.desc&select=id,title,updated_at`
  const res = await supabaseFetch(url, serviceKey)
  if (!res.ok) throw new Error(`Supabase: ${await res.text()}`)
  return (await res.json()) as Array<{ id: string; title: string | null; updated_at: string }>
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
