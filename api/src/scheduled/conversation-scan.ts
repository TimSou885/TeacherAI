/**
 * Phase 1 Week 27-28: 每晚 23:00 執行的 AI 對話掃描
 * 取得最近 24h 更新的對話，呼叫 AI 判斷是否需標記，寫入 conversation_flags。
 */

import { chatComplete } from '../services/azure-openai'
import * as supabase from '../services/supabase'
import type { Env } from '../index'

const MAX_CONVERSATIONS_PER_RUN = 20

export async function runConversationScan(env: Env): Promise<{ scanned: number; flagged: number }> {
  const baseUrl = env.SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
  const endpoint = (env.AZURE_OPENAI_ENDPOINT ?? '').trim()
  const apiKey = (env.AZURE_OPENAI_API_KEY ?? '').trim()

  if (!baseUrl || !serviceKey || !endpoint || !apiKey) {
    console.warn('conversation-scan: missing env, skip')
    return { scanned: 0, flagged: 0 }
  }

  const since = new Date()
  since.setUTCDate(since.getUTCDate() - 1)
  const sinceIso = since.toISOString()

  const [conversationIds, flaggedSet] = await Promise.all([
    supabase.getConversationIdsUpdatedSince(baseUrl, serviceKey, sinceIso),
    supabase.getFlaggedConversationIds(baseUrl, serviceKey),
  ])

  const toScan = conversationIds
    .map((r) => r.id)
    .filter((id) => !flaggedSet.has(id))
    .slice(0, MAX_CONVERSATIONS_PER_RUN)

  let flagged = 0
  for (const convId of toScan) {
    try {
      const messages = await supabase.getConversationMessages(baseUrl, serviceKey, convId)
      if (messages.length === 0) continue
      const text = messages.map((m) => `${m.role}: ${m.content.slice(0, 500)}`).join('\n')
      const prompt = `以下是一段 AI 學伴與學生的對話摘要，請判斷是否有：知識錯誤、不當內容、或需成人關注的學生情緒。
只輸出 JSON：{"flag": true/false, "risk_score": 0-10, "summary": "一句說明"}
若無問題則 flag 為 false，risk_score 為 0。\n\n${text.slice(0, 3000)}`
      const raw = await chatComplete(endpoint, apiKey, [
        { role: 'system', content: '你只輸出 JSON，不要其他文字。' },
        { role: 'user', content: prompt },
      ], { max_tokens: 200 })
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      const result = jsonMatch ? (JSON.parse(jsonMatch) as { flag?: boolean; risk_score?: number; summary?: string }) : {}
      if (result.flag && result.risk_score != null) {
        await supabase.insertConversationFlag(baseUrl, serviceKey, {
          conversation_id: convId,
          flag_type: 'nightly_scan',
          risk_score: Math.min(10, Math.max(0, result.risk_score)),
          ai_summary: result.summary ?? null,
          status: 'pending',
        })
        flagged++
      }
    } catch (e) {
      console.error('conversation-scan conv', convId, e)
    }
  }

  return { scanned: toScan.length, flagged }
}
