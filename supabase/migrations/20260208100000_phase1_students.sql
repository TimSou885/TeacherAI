-- Phase 1: students table (Week 9-10 學生登入系統)
-- classes 已存在於 Phase 0

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  display_name TEXT,
  grade_level INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(class_id, name)
);

CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);

-- conversations.student_id 可選加 FK（Phase 0 已存在欄位，此處僅加約束可選）
-- ALTER TABLE conversations ADD CONSTRAINT fk_conversations_student
--   FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL;
