-- 將指定班級設為您負責（請在 Supabase SQL Editor 執行）
-- 將班級 id 換成實際值（例如 0325f90c-36a1-4c1e-aabb-c7846757af03）

UPDATE classes
SET teacher_id = 'dc00d4af-7548-477e-992e-3276f5cd0570'
WHERE id = '0325f90c-36a1-4c1e-aabb-c7846757af03';

-- 清除 teacher_id 前後空白（若欄位為 text 才需要；UUID 型別可略過）
-- UPDATE classes SET teacher_id = trim(teacher_id::text)::uuid WHERE id = '0325f90c-36a1-4c1e-aabb-c7846757af03';

-- 確認該班 teacher_id（UUID 型別用 length(teacher_id::text)）
SELECT id, name, teacher_id, length(teacher_id::text) AS len
FROM classes
WHERE id = '0325f90c-36a1-4c1e-aabb-c7846757af03';

-- 若要把「所有尚未設定負責老師的班級」都設成您，可改用：
-- UPDATE classes
-- SET teacher_id = 'dc00d4af-7548-477e-992e-3276f5cd0570'
-- WHERE teacher_id IS NULL;
