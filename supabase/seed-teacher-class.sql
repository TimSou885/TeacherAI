-- 建立班級並設定 teacher_id（讓老師在 AI 出題頁能看到班級）
--
-- 步驟：
-- 1. 到 Supabase Dashboard → Authentication → Users，複製你的 User UID（例如 abc123-...）
-- 2. 將本檔中所有 'YOUR_AUTH_USER_UID' 替換成該 UID
-- 3. 在 SQL Editor 貼上並執行「方式一」或「方式二」其中一段
--

-- ========== 方式一：已有班級（例如跑過 seed-student-login-test.sql）==========
-- 只更新該班級的 teacher_id，讓目前登入的老師能看到
/*
UPDATE classes
SET teacher_id = 'YOUR_AUTH_USER_UID'
WHERE join_code = '3A2026';
*/

-- ========== 方式二：從頭建立學校 + 班級 ==========
-- 若還沒有 schools / classes，先執行這段（請替換 YOUR_AUTH_USER_UID）
-- 若班級已存在（join_code 3A2026），會只更新 teacher_id
/*
INSERT INTO schools (name, region)
VALUES ('測試小學', 'macau');

INSERT INTO classes (school_id, name, subject, join_code, teacher_id)
SELECT id, '小三A班', 'chinese', '3A2026', 'YOUR_AUTH_USER_UID'
FROM schools
WHERE name = '測試小學'
ORDER BY created_at DESC
LIMIT 1
ON CONFLICT (join_code) DO UPDATE SET teacher_id = EXCLUDED.teacher_id;
*/
