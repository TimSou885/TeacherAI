-- 教科書對照：課次／單元欄位

ALTER TABLE lesson_texts ADD COLUMN IF NOT EXISTS textbook_ref TEXT;
ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS textbook_ref TEXT;
