/**
 * Phase 1 Week 27-28: API 成本追蹤
 * 在所有 AI / Polly 呼叫點呼叫 logCost，寫入 api_cost_log。
 */

import * as supabase from './supabase'
import type { Env } from '../index'

// 參考定價（約略，供預估）
const OPENAI_INPUT_USD_PER_1M = 0.15
const OPENAI_OUTPUT_USD_PER_1M = 0.6
const POLLY_USD_PER_1M_CHARS = 4

export type CostLogPayload = {
  school_id?: string | null
  service: 'azure_openai' | 'polly'
  model?: string | null
  input_tokens?: number | null
  output_tokens?: number | null
  polly_chars?: number | null
}

function estimatedCostUsd(p: CostLogPayload): number {
  if (p.service === 'polly') {
    const chars = p.polly_chars ?? 0
    return (chars / 1_000_000) * POLLY_USD_PER_1M_CHARS
  }
  const input = (p.input_tokens ?? 0) / 1_000_000 * OPENAI_INPUT_USD_PER_1M
  const output = (p.output_tokens ?? 0) / 1_000_000 * OPENAI_OUTPUT_USD_PER_1M
  return input + output
}

/**
 * 寫入一筆成本到 api_cost_log（不拋錯，失敗只 log console）。
 */
export async function logCost(
  baseUrl: string,
  serviceKey: string,
  payload: CostLogPayload
): Promise<void> {
  const cost = estimatedCostUsd(payload)
  if (cost <= 0 && !payload.input_tokens && !payload.output_tokens && !payload.polly_chars) return
  try {
    const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/api_cost_log`
    const res = await supabase.supabaseFetch(url, serviceKey, {
      method: 'POST',
      body: JSON.stringify({
        school_id: payload.school_id ?? null,
        service: payload.service,
        model: payload.model ?? null,
        input_tokens: payload.input_tokens ?? null,
        output_tokens: payload.output_tokens ?? null,
        polly_chars: payload.polly_chars ?? null,
        estimated_cost_usd: Math.round(cost * 1_000_000) / 1_000_000,
      }),
      headers: { Prefer: 'return=minimal' },
    })
    if (!res.ok) {
      console.error('cost-tracker: api_cost_log insert failed', await res.text())
    }
  } catch (e) {
    console.error('cost-tracker:', e)
  }
}

/**
 * 依字數粗估 token（中文約 1.5 字/token，英文約 4 字/token），用於串流等無法取得實際 token 時。
 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  const ch = (text.match(/[\u4e00-\u9fff]/g) ?? []).length
  const other = text.length - ch
  return Math.ceil(ch / 1.5 + other / 4)
}
