-- Phase 1 Week 27-28: 管理員後台相關表
-- admin_users, api_cost_log, system_config, conversation_flags

-- 17. 管理員帳號表（user_id 為 Supabase auth.users.id）
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'super_admin',
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);

-- 18. API 成本追蹤日誌（school_id 可為 NULL 表示全系統）
CREATE TABLE IF NOT EXISTS api_cost_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id),
  service TEXT NOT NULL,
  model TEXT,
  input_tokens INT,
  output_tokens INT,
  polly_chars INT,
  estimated_cost_usd NUMERIC(10, 6) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_cost_log_created ON api_cost_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_cost_log_service ON api_cost_log(service, created_at DESC);

-- 19. 系統配置表
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 21. AI 對話標記表（每晚掃描或手動標記）
CREATE TABLE IF NOT EXISTS conversation_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL,
  all_flags TEXT[] DEFAULT '{}',
  risk_score INT CHECK (risk_score BETWEEN 0 AND 10),
  ai_summary TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_flags_conversation ON conversation_flags(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_flags_status ON conversation_flags(status);
CREATE INDEX IF NOT EXISTS idx_conversation_flags_created ON conversation_flags(created_at DESC);
