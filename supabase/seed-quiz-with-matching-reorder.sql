-- 建立含配對題、排序題的測驗練習（供測驗標準答案顯示測試）
-- 需先有班級：執行 seed-student-login-test.sql 或已有 classes 資料

INSERT INTO exercises (class_id, subject, title, category, questions, grade_level, is_active)
SELECT
  c.id,
  'chinese',
  '配對與排序練習',
  'reading',
  '[
    {
      "type": "matching",
      "question": "請將左邊的詞語與右邊正確的解釋配對。",
      "left": ["勤勞", "勇敢", "聰明"],
      "right": ["不怕困難", "努力工作", "頭腦靈活"],
      "correct_pairs": [[0, 1], [1, 0], [2, 2]]
    },
    {
      "type": "reorder",
      "question": "請將下列句子排成通順的段落：",
      "sentences": ["小明起床了。", "他刷了牙、洗了臉。", "然後吃完早餐就去上學。"],
      "correct_order": [0, 1, 2]
    },
    {
      "type": "short_answer",
      "question": "你喜歡哪一種動物？為什麼？",
      "reference_answer": "我喜歡小狗，因為牠很忠心又可愛。",
      "scoring_guide": "言之有理即可"
    }
  ]'::jsonb,
  3,
  true
FROM (SELECT id FROM classes LIMIT 1) c;
