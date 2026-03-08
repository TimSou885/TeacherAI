-- 課文庫：儲存教師的課文/知識點，供 AI 出題時選用

CREATE TABLE IF NOT EXISTS lesson_texts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_text TEXT NOT NULL,
  learning_objectives TEXT,
  key_vocabulary TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lesson_texts_teacher ON lesson_texts(teacher_id);
