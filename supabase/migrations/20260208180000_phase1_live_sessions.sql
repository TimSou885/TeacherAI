-- Phase 1 Week 23-26: 即時課堂測驗
-- live_sessions: 教師建立；live_participants: 學生加入

CREATE TABLE IF NOT EXISTS live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id TEXT NOT NULL,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'started', 'ended')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_live_sessions_code ON live_sessions(code);
CREATE INDEX IF NOT EXISTS idx_live_sessions_class ON live_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_teacher ON live_sessions(teacher_id);

CREATE TABLE IF NOT EXISTS live_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_live_participants_session ON live_participants(session_id);

-- 啟用 Realtime（若專案使用 Supabase Realtime 出版物，需在 Dashboard 將此兩表加入 publication）
-- ALTER PUBLICATION supabase_realtime ADD TABLE live_sessions;
-- ALTER PUBLICATION supabase_realtime ADD TABLE live_participants;
