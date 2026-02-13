-- Phase 1 Week 20-22: AI 自動生成的內容草稿
-- 依 architecture.md 2.9：貼課文 → AI 生成題目 → 存草稿 → 審核發佈

CREATE TABLE IF NOT EXISTS ai_generated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject TEXT NOT NULL DEFAULT 'chinese',
  category TEXT NOT NULL,
  source_text TEXT,
  generated_content JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected')),
  approved_content JSONB,
  teacher_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_generated_content_class ON ai_generated_content(class_id);
CREATE INDEX IF NOT EXISTS idx_ai_generated_content_status ON ai_generated_content(class_id, status);
