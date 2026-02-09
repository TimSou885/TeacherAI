-- 建立一筆默書練習（需先執行 phase0 + phase1 表，以及 seed-student-login-test.sql 至少一筆班級）
-- 使用「第一個班級」作為 class_id；若有多班可改為指定 id

INSERT INTO exercises (class_id, subject, title, category, questions, grade_level, is_active)
SELECT
  c.id,
  'chinese',
  '第五課默書',
  'dictation',
  '[
    {"word": "溫暖", "pinyin": "wēn nuǎn", "hint": "形容天氣不冷、很舒服"},
    {"word": "春天", "pinyin": "chūn tiān", "hint": "四季之一，花草會長出來"},
    {"word": "高興", "pinyin": "gāo xìng", "hint": "心情很好、很開心"}
  ]'::jsonb,
  3,
  true
FROM (SELECT id FROM classes LIMIT 1) c;
