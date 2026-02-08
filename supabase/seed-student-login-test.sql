-- 學生登入測試資料：1 間學校、1 個班（join_code 3A2026）、3 位學生
-- 在 Supabase SQL Editor 貼上整段執行即可

WITH new_school AS (
  INSERT INTO schools (name, region)
  VALUES ('測試小學', 'macau')
  RETURNING id
),
new_class AS (
  INSERT INTO classes (school_id, name, subject, join_code)
  SELECT id, '小三A班', 'chinese', '3A2026'
  FROM new_school
  RETURNING id
)
INSERT INTO students (class_id, school_id, name, display_name, grade_level)
SELECT c.id, s.id, n.name, n.display_name, n.grade_level
FROM new_class c, new_school s,
 (VALUES
   ('小明', '小明', 3),
   ('小華', '小華', 3),
   ('小美', '小美', 3)
 ) AS n(name, display_name, grade_level);
