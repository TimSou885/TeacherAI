# Phase 1：能用（第 9-30 週，約 165 小時）

> **前置文件：** 完整技術棧、Schema、Prompt 設計見 [architecture.md](architecture.md)
> **前置階段：** [Phase 0](phase-0.md) 的所有驗收項目已通過

---

## 目標一句話

太太在她的 2-3 個班連續使用 2 週，每班至少 2/3 的學生有使用記錄，太太覺得「省了我很多時間，學生的錯題也在減少」。

---

## 本階段開發的功能清單

| # | 功能 | 說明 | 對應 architecture.md |
|---|------|------|---------------------|
| 1 | 學生登入系統 | 班級代碼 + 姓名選擇，不需密碼 | 2.3 |
| 2 | 冷啟動體驗 | 新學生第一次登入的引導對話 | 2.15 |
| 3 | 默書練習 + Polly 語音 | 聽寫/解釋/拼音多種模式 + Neural 中文語音 + R2 快取 | 2.5、2.6 |
| 4 | HanziWriter 筆順 | 筆順動畫展示 + 筆順練習測驗 | 2.5 |
| 5 | 統一練習框架（六大範疇） | 選擇/填空/排序/配對/判斷/簡答題 + AI 輔助評分 | 2.5 |
| 6 | 錯題本 + 自動重練 | 答錯進錯題本、連續答對 3 次移出 + AI 錯誤分析 | 2.8 |
| 7 | AI 自動出題 | 太太貼課文 → AI 生成六大範疇練習 → 審核發佈 | 2.9 |
| 8 | 向量搜索整合 | 教材嵌入 Vectorize、RAG 增強對話、相似題搜索 | 2.7 |
| 9 | AI 主動引導練習 | 根據錯題記錄主動出題，包裝為遊戲/挑戰 | 3.6 |
| 10 | 教師儀表板 | 多班級切換、班級總覽、學生詳情、內容管理、弱項分析 | 4.1、4.2 |
| 11 | 課堂投影模式 | 隨堂測驗（口答）、筆順教學、錯題討論 | 2.14 |
| 12 | 即時課堂測驗 | Supabase Realtime 同步的 Kahoot 模式 | 2.14 |
| 13 | 管理員後台 Phase 1 | 系統總覽 + AI 每日摘要、成本監控、AI 對話自動掃描 | 4.6 |
| 14 | 手機適配 | 底部 Tab Bar、44px 觸控區、16px 最小字體 | 2.16 |

---

## 週次分解

### 第 9-10 週：學生登入系統（約 15 小時）

- 建立 `students` 表（Phase 0 已有 `schools`、`classes`）
- 前端：學生登入頁——輸入班級代碼 → 顯示該班學生名單 → 點名字登入
- API：`/api/auth/student-login` 路由（驗證班級代碼 + 學生 ID → 回傳 JWT）
- 前端：學生首頁（底部 Tab Bar：對話、練習、作文、我的）
- 冷啟動體驗：新學生首次登入的 AI 引導對話（2.15）

### 第 11-13 週：默書練習 + Polly 語音（約 25 小時）

- 建立 `exercises` 和 `exercise_attempts` 表
- API：`/api/tts` 路由（Polly 語音合成 + R2 快取，見 architecture.md 2.6）
- 前端：默書練習頁——選擇默書 → 逐題聽語音寫漢字 → 精確匹配評分
- 支援三種提示模式：聽寫（Polly）、解釋寫詞語（AI 生成）、看拼音寫漢字
- `polly.ts`、`r2.ts` 服務封裝
- 前端：`AudioPlayer.tsx` 音頻播放器組件

### 第 14 週：HanziWriter 筆順（約 8 小時）

- 安裝 `hanzi-writer` npm 套件
- 前端：`StrokeAnimator.tsx`（筆順動畫展示）、`StrokeQuiz.tsx`（筆順練習測驗）
- 整合到默書練習：答錯的字顯示筆順動畫按鈕
- 整合到 AI 對話：AI 教新字時觸發筆順動畫

### 第 15-17 週：測驗功能全流程（約 25 小時）

- 前端：`Practice.tsx`（練習入口，按範疇分類）、`PracticeSession.tsx`（具體練習頁面）
- 支援六種題型：選擇/填空/排序（拖放）/配對/判斷/簡答
- API：`/api/exercise` 路由（取題、提交答案、評分）
- API：`/api/score` 路由（簡答題 AI 輔助評分，GPT-4o-mini）
- 即時回饋：每題作答後顯示對錯 + 解析

### 第 18-19 週：錯題本 + 自動重練（約 15 小時）

- 建立 `error_book` 表
- 答錯自動寫入錯題本（含 AI 錯誤分析：形近字/同音字/筆劃）
- 前端：`ErrorBook.tsx`（錯題列表 + 錯題複習入口）
- 錯題複習模式：從 `error_book` 抽 `is_resolved = false` 的題，每次最多 10 題
- 連續答對 3 次 → `is_resolved = true`

### 第 20-22 週：AI 自動出題 + 向量搜索（約 25 小時）

- 建立 `ai_generated_content` 表
- API：`/api/generate` 路由（接收課文 + 範疇 → AI 生成題目 → 存草稿）
- 前端：教師「AI 出題」入口（貼課文 → 選範疇 → 預覽 → 審核修改 → 發佈）
- 「一鍵生成全範疇」功能（同時呼叫 5 個範疇 prompt）
- 「根據錯題出複習題」功能（查全班 error_book → 按錯誤頻率出題）
- 向量搜索整合：將更多教材嵌入 Vectorize，增強 AI 對話的 RAG
- AI 主動引導練習：對話開始時查錯題 + 搜 Vectorize 注入 prompt（3.6）

### 第 23-26 週：教師儀表板 + 課堂模式（約 32 小時）

- 前端：教師 `Dashboard.tsx`（班級切換器、今日活躍、本週總覽、默書成績、AI 對話趨勢摘要）
- 前端：`Students.tsx`（學生列表、點擊看學生詳情）
- 前端：`Content.tsx`（內容管理——默書詞表、測驗題、AI 出題入口、跨班共享）
- 班級弱項分析（六大範疇健康度、高頻錯題 TOP 5、AI 教學建議）
- 課堂投影模式：`Quiz.tsx`（隨堂測驗）、`StrokeTeach.tsx`（筆順教學）、`ErrorReview.tsx`（錯題討論）
- 即時課堂測驗：`Live.tsx`（教師端）+ `Join.tsx`（學生端）+ Supabase Realtime 同步

### 第 27-28 週：管理員後台 Phase 1（約 15 小時）

- 建立 `admin_users`、`api_cost_log`、`system_config`、`conversation_flags` 表
- API：`/api/admin/*` 路由（系統統計、成本查詢、對話標記查詢）
- `admin.ts` 中介軟體（驗證管理員角色）
- `cost-tracker.ts` 服務（在所有 AI 呼叫點加入成本追蹤）
- 前端：`admin/Dashboard.tsx`（系統總覽 + AI 每日摘要）
- 前端：`admin/CostMonitor.tsx`（即時成本監控 + 預算告警）
- 前端：`admin/Conversations.tsx`（AI 智慧對話審核）
- Cron Trigger：每晚 23:00 AI 對話自動掃描（`conversation-scan.ts`）

### 第 29-30 週：太太班上實測 2 週

- 太太在 2-3 個班正式使用
- 收集學生和太太的回饋
- 修復 bug、調整 UI、優化 prompt
- 如果期間有校內測驗，記錄分數作為 Phase 2 的 baseline

---

## 本階段新增的資料庫表（9 張，累計 14 張）

Phase 0 已有 5 張表。Phase 1 新增以下 9 張：

```sql
-- 3. 學生
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  class_id UUID REFERENCES classes(id),
  school_id UUID REFERENCES schools(id),
  display_name TEXT,
  grade_level INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(class_id, name)
);

-- 6. 練習集
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id),
  subject TEXT NOT NULL DEFAULT 'chinese',
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  questions JSONB NOT NULL,
  source_text TEXT,
  grade_level INT,
  is_pretest BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. 練習作答記錄
CREATE TABLE exercise_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID REFERENCES exercises(id),
  student_id UUID REFERENCES students(id),
  answers JSONB NOT NULL,
  score NUMERIC(5,2),
  total_questions INT,
  correct_count INT,
  completed_at TIMESTAMPTZ DEFAULT now()
);

-- 8. 錯題本
CREATE TABLE error_book (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  subject TEXT NOT NULL DEFAULT 'chinese',
  category TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id UUID,
  error_content JSONB NOT NULL,
  correct_count INT DEFAULT 0,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- 9. AI 自動生成的內容草稿
CREATE TABLE ai_generated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id),
  subject TEXT NOT NULL DEFAULT 'chinese',
  category TEXT NOT NULL,
  source_text TEXT,
  generated_content JSONB NOT NULL,
  status TEXT DEFAULT 'draft',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 17. 管理員帳號表
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  role TEXT DEFAULT 'super_admin',
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- 18. API 成本追蹤日誌
CREATE TABLE api_cost_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id),
  service TEXT NOT NULL,
  model TEXT,
  input_tokens INT,
  output_tokens INT,
  polly_chars INT,
  estimated_cost_usd NUMERIC(10, 6) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 19. 系統配置表
CREATE TABLE system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 21. AI 對話標記表
CREATE TABLE conversation_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL,
  all_flags TEXT[] DEFAULT '{}',
  risk_score INT CHECK (risk_score BETWEEN 0 AND 10),
  ai_summary TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

（完整 SQL 含索引見 architecture.md 附錄 A）

---

## 本階段的 AI 功能

| AI 功能 | 模型/技術 | 用途 |
|---------|----------|------|
| AI 對話（延續 Phase 0） | GPT-4o-mini + Vectorize RAG | 個人化中文教學對話 |
| 默書語音 | Amazon Polly Neural (Zhiyu) | 高品質普通話朗讀詞語 |
| 默書解釋提示 | GPT-4o-mini | 為默書詞語生成小學生友好的解釋 |
| 簡答題評分 | GPT-4o-mini | 自動評分開放式回答 |
| 錯題分析 | GPT-4o-mini | 分析錯誤類型（形近字/同音字/筆劃），生成提示 |
| AI 自動出題 | GPT-4o-mini | 根據課文一鍵生成六大範疇練習題 |
| AI 主動引導 | GPT-4o-mini + Vectorize | 根據錯題包裝為遊戲/挑戰引導複習 |
| 班級弱項建議 | GPT-4o-mini | 根據錯誤數據生成教學重點建議 |
| 對話趨勢摘要 | GPT-4o-mini | 生成本班對話趨勢 1-2 句摘要 |
| 管理員每日摘要 | GPT-4o-mini | Dashboard 自然語言總結 |
| 對話自動掃描 | GPT-4o-mini (Cron) | 每晚自動標記問題對話 |
| 成本追蹤 | cost-tracker.ts | 記錄每次 AI/Polly 呼叫費用 |

---

## 本階段成本估算

| 項目 | 費用 |
|------|------|
| Cloudflare（全部服務） | HKD 0 |
| Supabase | HKD 0 |
| Azure OpenAI（60-90 學生日常使用） | HKD 100-300 |
| Amazon Polly（默書語音，首年免費額度內） | HKD 0-40 |
| Cursor Pro | HKD 160 |
| **合計** | **HKD 260-500** |

---

## 驗收標準

### 場景一：學生日常練習

小明（小三A班）在手機上輸入班級代碼 `3A2026`，看到同班同學名單，點自己的名字登入。底部 Tab 顯示「對話、練習、作文、我的」。他點「練習」，看到「默書、閱讀理解、語文基礎、詞語運用、排句成段」五個範疇入口。點「默書」，選擇太太發佈的「第五課默書」，聽到清晰的普通話朗讀「溫暖」，在輸入框打字。答錯了，系統顯示正確答案 + 筆順動畫。這個錯題自動進入錯題本。

### 場景二：太太備課出題

太太在教師儀表板的「內容管理」頁面點「AI 幫我出題」，貼上第六課的課文，勾選「閱讀理解 + 語文基礎 + 默書」，點「一鍵生成」。10 秒後 AI 生成了 5 道閱讀理解題 + 5 道語文基礎題 + 12 個默書詞語。太太掃一眼，刪掉一道太難的推斷題，修改一個默書詞語，勾選「發佈到小三A班 + 小三B班」，發佈。兩個班的學生立刻可以看到新練習。整個過程 8 分鐘。

### 場景三：太太看班級數據

太太打開儀表板，頂部切換到「小三A班」。看到今日 28 個學生活躍、本週默書平均 78 分、AI 對話趨勢摘要「本週學生最常問詞義和筆順」。點「班級弱項分析」，看到語文基礎只有 52%、閱讀理解 78%。AI 建議「標點符號錯誤率最高，建議下週課堂加強」。太太點「根據弱項出複習題」，AI 自動生成一套標點專項練習。

### 場景四：課堂投影

太太上課時打開「課堂模式」→「投影模式」→ 選擇一份練習。大螢幕顯示第一題，字體超大。學生舉手回答，太太按「顯示答案」。接著切換到筆順教學，大螢幕播放「溫」字的筆順動畫。

### 場景五：管理員檢查系統

你登入管理員後台，Dashboard 顯示「今天 42 位學生活躍，本月 API 成本 HKD 156，2 則對話被 AI 標記」。你點進成本監控，看到預算進度條和按服務分攤。點進對話審核，只有 2 則被 AI 標記的對話需要查看——一則疑似知識錯誤，一則學生情緒關注。

### Checklist

**學生功能：**
- [ ] 學生用班級代碼 + 姓名可以登入
- [ ] 新學生第一次登入有 AI 引導對話
- [ ] 默書練習支援三種提示模式（聽寫/解釋/拼音）
- [ ] Polly 語音清晰、語速適合小學生
- [ ] 音頻有 R2 快取（第二次播放秒開）
- [ ] HanziWriter 筆順動畫正常播放
- [ ] HanziWriter 筆順測驗可以用手指描畫、有即時回饋
- [ ] 六種題型全部可以作答和評分
- [ ] 簡答題有 AI 輔助評分
- [ ] 答錯的題自動進入錯題本
- [ ] 錯題複習模式正常運作（連續答對 3 次移出）
- [ ] AI 主動引導練習能根據錯題出題
- [ ] 手機上底部 Tab Bar 可正常切換、觸控區域 ≥ 44px

**教師功能：**
- [ ] 教師儀表板有班級切換器
- [ ] Dashboard 顯示今日活躍、默書成績、弱項分析、AI 對話趨勢摘要
- [ ] 學生詳情頁顯示成績趨勢和錯題狀態
- [ ] 內容管理頁可以新增/編輯/刪除默書和測驗
- [ ] AI 出題功能正常（貼課文 → 選範疇 → 生成 → 審核 → 發佈）
- [ ] 「一鍵生成全範疇」和「根據錯題出題」都能用
- [ ] 跨班共享（同年級一鍵發佈到多個班）
- [ ] 課堂投影模式字體夠大、操作簡單
- [ ] 即時課堂測驗（Kahoot 模式）能同步作答

**管理員後台：**
- [ ] Dashboard 有 AI 每日摘要
- [ ] 成本監控顯示按服務分攤的費用
- [ ] 預算告警閾值可設定
- [ ] Cron 每晚 23:00 自動掃描對話
- [ ] 被標記的對話可以在後台查看和處理
- [ ] 成本追蹤已整合到所有 AI/Polly 呼叫點

**數據基礎：**
- [ ] 所有練習成績正確記錄到 `exercise_attempts`
- [ ] 錯題本數據正確記錄到 `error_book`
- [ ] AI 生成的內容記錄到 `ai_generated_content`
- [ ] API 成本記錄到 `api_cost_log`

---

## 進入 Phase 2 的前提條件

- [ ] 以上所有 Checklist 項目都已勾選
- [ ] 太太在 2-3 個班連續使用至少 2 週
- [ ] 每班至少 2/3 的學生有使用記錄
- [ ] 太太回饋正面：「省時間」「學生的錯題在減少」
- [ ] 如有校內測驗，分數已記錄作為 baseline
- [ ] 管理員後台能正常監控成本和對話品質
- [ ] 月度 API 成本在 HKD 500 預算以內
