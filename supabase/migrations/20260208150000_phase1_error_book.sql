-- Phase 1 Week 18-19: 錯題本
-- 依 architecture.md 2.8：答錯進錯題本、連續答對 3 次移出

CREATE TABLE IF NOT EXISTS error_book (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  subject TEXT NOT NULL DEFAULT 'chinese',
  category TEXT NOT NULL,
  question_index INT NOT NULL,
  error_content JSONB NOT NULL,
  correct_count INT DEFAULT 0,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_practiced_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_error_book_unique
  ON error_book(student_id, exercise_id, question_index);

CREATE INDEX IF NOT EXISTS idx_error_book_student ON error_book(student_id);
CREATE INDEX IF NOT EXISTS idx_error_book_unresolved
  ON error_book(student_id, is_resolved) WHERE is_resolved = false;
