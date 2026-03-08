-- Phase 3: 學情設定

ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS student_profile TEXT;
