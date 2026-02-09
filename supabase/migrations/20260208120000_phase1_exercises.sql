-- Phase 1 Week 11-13: exercises + exercise_attempts（默書練習用）
-- 依 phase-1.md 與 architecture 附錄 A 精簡版（無 is_mock_exam 等擴展欄位，後續可 ALTER）

CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject TEXT NOT NULL DEFAULT 'chinese',
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]',
  source_text TEXT,
  grade_level INT,
  is_pretest BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exercise_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '[]',
  score NUMERIC(5,2),
  total_questions INT,
  correct_count INT,
  completed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercises_class ON exercises(class_id);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(class_id, category);
CREATE INDEX IF NOT EXISTS idx_exercise_attempts_student ON exercise_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_exercise_attempts_exercise ON exercise_attempts(exercise_id);
