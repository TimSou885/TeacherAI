const DEPLOYMENT_CHAT = 'gpt-4o-mini'
const DEPLOYMENT_EMBED = 'text-embedding-3-small'
const API_VERSION = '2024-02-15-preview'
const EMBED_DIMENSIONS = 1536

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

/** 取得單段文字的 embedding（1536 維，供 Vectorize 使用） */
export async function getEmbedding(endpoint: string, apiKey: string, text: string): Promise<number[]> {
  const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${DEPLOYMENT_EMBED}/embeddings?api-version=${API_VERSION}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({ input: text.slice(0, 8000) }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Azure OpenAI Embeddings: ${res.status} ${err}`)
  }
  const data = (await res.json()) as { data?: Array<{ embedding?: number[] }> }
  const embedding = data.data?.[0]?.embedding
  if (!embedding || embedding.length !== EMBED_DIMENSIONS) {
    throw new Error(`Azure OpenAI Embeddings: unexpected response shape`)
  }
  return embedding
}

/** 根據第一則使用者訊息與助手回覆生成簡短標題（非串流） */
export async function generateConversationTitle(
  endpoint: string,
  apiKey: string,
  userMessage: string,
  assistantReply: string
): Promise<string> {
  const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${DEPLOYMENT_CHAT}/chat/completions?api-version=${API_VERSION}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'system',
          content:
            '你只能根據對話內容輸出「一句簡短標題」，中文、15 字以內，不要引號或說明，只輸出標題本身。',
        },
        {
          role: 'user',
          content: `使用者：${userMessage.slice(0, 300)}\n\n助手回覆（摘要）：${assistantReply.slice(0, 400)}\n\n請輸出上述對話的簡短標題（15 字以內）：`,
        },
      ],
      stream: false,
      max_tokens: 30,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Azure OpenAI: ${res.status} ${err}`)
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const title = data.choices?.[0]?.message?.content?.trim() ?? ''
  return title.slice(0, 100) || '新對話'
}

export async function chatStream(
  endpoint: string,
  apiKey: string,
  messages: ChatMessage[]
): Promise<ReadableStream<Uint8Array>> {
  const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${DEPLOYMENT_CHAT}/chat/completions?api-version=${API_VERSION}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      messages,
      stream: true,
      max_tokens: 1024,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Azure OpenAI: ${res.status} ${err}`)
  }
  const body = res.body
  if (body && typeof (body as ReadableStream).getReader === 'function') {
    return body as ReadableStream<Uint8Array>
  }
  const buf = await res.arrayBuffer()
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(buf))
      controller.close()
    },
  })
}

/** 單次 completion（非串流），用於簡答題評分等 */
export async function chatComplete(
  endpoint: string,
  apiKey: string,
  messages: ChatMessage[],
  options?: { max_tokens?: number }
): Promise<string> {
  const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${DEPLOYMENT_CHAT}/chat/completions?api-version=${API_VERSION}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      messages,
      stream: false,
      max_tokens: options?.max_tokens ?? 512,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Azure OpenAI: ${res.status} ${err}`)
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  return data.choices?.[0]?.message?.content?.trim() ?? ''
}

export function parseAzureStream(
  stream: ReadableStream<Uint8Array>,
  onContent: (delta: string) => void
): Promise<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let full = ''
  let buffer = ''
  return (async () => {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const idx = buffer.indexOf('\n')
      if (idx === -1) continue
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
        try {
          const data = JSON.parse(line.slice(6)) as { choices?: Array<{ delta?: { content?: string } }> }
          const content = data.choices?.[0]?.delta?.content
          if (content) {
            full += content
            onContent(content)
          }
        } catch {
          // skip malformed
        }
      }
    }
    if (buffer.startsWith('data: ') && buffer !== 'data: [DONE]') {
      try {
        const data = JSON.parse(buffer.slice(6)) as { choices?: Array<{ delta?: { content?: string } }> }
        const content = data.choices?.[0]?.delta?.content
        if (content) {
          full += content
          onContent(content)
        }
      } catch {
        // skip
      }
    }
    return full
  })()
}
