-- 教案設計進階：核心概念、核心問題、關鍵提問、詳案/簡案、評量設計

ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS core_concept TEXT;
ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS core_question TEXT;
ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS key_questions JSONB DEFAULT '[]';
ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS plan_mode TEXT DEFAULT 'detailed';
ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS assessment_design TEXT;
