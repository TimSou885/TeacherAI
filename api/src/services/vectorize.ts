/**
 * Vectorize 服務封裝（RAG）
 * 需在 wrangler.toml 設定 [[vectorize]] binding，並建立 1536 維、cosine 的 index
 */

export type VectorizeMatch = {
  id: string
  score: number
  metadata?: { text?: string }
}

/** 查詢最相關的 topK 筆，回傳 id、score、metadata（含 text） */
export async function queryRag(
  index: {
    query(
      vector: number[],
      options?: { topK?: number; returnMetadata?: boolean }
    ): Promise<{ matches?: Array<{ id: string; score: number; metadata?: Record<string, unknown> }> }>
  },
  vector: number[],
  topK: number
): Promise<VectorizeMatch[]> {
  const result = await index.query(vector, { topK, returnMetadata: true })
  const matches = result.matches ?? []
  return matches.map((m) => ({
    id: m.id,
    score: m.score,
    metadata: m.metadata as { text?: string } | undefined,
  }))
}

/** 插入多筆向量（id, values, metadata.text 存原文供檢索後注入 prompt） */
export async function insertVectors(
  index: {
    insert(vectors: Array<{ id: string; values: number[]; metadata?: Record<string, string> }>): Promise<unknown>
  },
  vectors: Array<{ id: string; values: number[]; text: string }>
) {
  const payload = vectors.map((v) => ({
    id: v.id,
    values: v.values,
    metadata: { text: v.text.slice(0, 1000) },
  }))
  await index.insert(payload)
}
