-- Phase 0: 5 tables for AI chat + RAG readiness
-- Run in Supabase SQL Editor or via supabase db push

-- 1. 學校（Phase 0 只插入一筆）
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  region TEXT DEFAULT 'macau',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 班級
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id),
  name TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT 'chinese',
  join_code TEXT UNIQUE NOT NULL,
  teacher_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 對話記錄（Phase 0 student_id 可為 NULL，老師測試用）
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID,
  subject TEXT DEFAULT 'chinese',
  title TEXT,
  mode TEXT DEFAULT 'chat',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 對話訊息
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. 向量嵌入追蹤（RAG 用，Phase 0 可先建表）
CREATE TABLE IF NOT EXISTS embeddings_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id UUID,
  class_id UUID REFERENCES classes(id),
  subject TEXT NOT NULL DEFAULT 'chinese',
  content_text TEXT NOT NULL,
  vector_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_conversations_student ON conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_conversations_subject ON conversations(subject);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_classes_school ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_class ON embeddings_log(class_id, subject);
CREATE INDEX IF NOT EXISTS idx_embeddings_content ON embeddings_log(content_type, content_id);

-- RLS: Phase 0 暫不啟用，Phase 3 再開
-- ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
