-- 將指定班級設為您負責（請在 Supabase SQL Editor 執行）
-- 將 YOUR_CLASS_ID 換成班級 id（例如 0325f90c-36a1-4c1e-aabb-c7846757af03）

UPDATE classes
SET teacher_id = 'dc00d4af-7548-477e-992e-3276f5cd0570'
WHERE id = '0325f90c-36a1-4c1e-aabb-c7846757af03';

-- 若要把「所有尚未設定負責老師的班級」都設成您，可改用：
-- UPDATE classes
-- SET teacher_id = 'dc00d4af-7548-477e-992e-3276f5cd0570'
-- WHERE teacher_id IS NULL;
