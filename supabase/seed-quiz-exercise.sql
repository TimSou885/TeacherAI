-- 建立一筆測驗練習（閱讀理解，含選擇/填空/判斷/簡答）供第 15-17 週驗收
-- 需先有班級：執行 seed-student-login-test.sql 或已有 classes 資料

INSERT INTO exercises (class_id, subject, title, category, questions, grade_level, is_active)
SELECT
  c.id,
  'chinese',
  '閱讀理解範例',
  'reading',
  '[
    {
      "type": "multiple_choice",
      "question": "這篇文章主要在講什麼？",
      "options": ["春天的花", "作者的學校", "一次旅行", "媽媽的生日"],
      "correct": 0
    },
    {
      "type": "fill_blank",
      "display_type": "填標點符號",
      "question": "媽媽說____你今天乖不乖____（請填入正確標點）",
      "correct": "：「」",
      "hint": "注意引號與冒號"
    },
    {
      "type": "true_false",
      "question": "「一條馬」這個量詞用法是否正確？",
      "correct": false,
      "explanation": "應該用「一匹馬」"
    },
    {
      "type": "short_answer",
      "question": "作者為什麼感到開心？用自己的話說一說。",
      "reference_answer": "因為作者和朋友一起玩，度過了快樂的一天。",
      "scoring_guide": "言之有理即可，需提及文中的具體事件"
    }
  ]'::jsonb,
  3,
  true
FROM (SELECT id FROM classes LIMIT 1) c;
