# Phase 3：能推廣（第 55-76 週，約 160 小時）

> **前置文件：** 完整技術棧、Schema、Prompt 設計見 [architecture.md](architecture.md)
> **前置階段：** [Phase 0](phase-0.md) + [Phase 1](phase-1.md) + [Phase 2](phase-2.md) 的所有驗收項目已通過

---

## 目標一句話

太太學校有 3 位以上的老師在使用，每位老師管理自己的 2-3 個班；有校內考試數據證明使用平台的班級成績提升；有可運行的收費機制。

---

## 本階段開發的功能清單

| # | 功能 | 說明 | 對應 architecture.md |
|---|------|------|---------------------|
| 1 | 多老師支援 | 其他老師可以註冊、管理自己的班級、互不干擾 | 5.8 |
| 2 | 多學校支援 | 架構已支援 school_id，Phase 3 啟用管理流程 | 5.8 |
| 3 | Row Level Security (RLS) | 啟用 Supabase RLS 實現數據隔離 | 附錄 A |
| 4 | 訂閱制收費（Stripe） | 免費版/基礎版/學校版，Stripe Checkout + Webhook | 5.9 |
| 5 | 功能閘門 (billing middleware) | 按方案限制功能和配額 | 5.9 |
| 6 | 正式用戶認證升級 | 取代班級代碼簡易登入（可選，視用戶量而定） | 5.4 |
| 7 | 更多年級中文內容 | 不同年級的 prompt 調整 + 內容擴充 | 5.8 |
| 8 | 管理員後台 Phase 3 | 學校/老師/帳單管理 + AI 自動化 | 4.6 |
| 9 | Prompt A/B 測試 | AI 驅動 prompt 分流 + 效果追蹤 + 自動勝出判斷 | 4.6（Phase 3 增強一） |
| 10 | 教學盲區發現 | Vectorize 反向分析學生高頻問題 vs 教材覆蓋 | 4.6（Phase 3 增強二） |
| 11 | 法規合規 | GPDP 登記（澳門個資保護）、隱私政策、商業實體 | 5.4 |

---

## 週次分解

### 第 55-58 週：多老師/多學校 + RLS（約 30 小時）

**目標：** 太太學校的其他老師可以各自註冊、管理班級，數據完全隔離。

- 啟用 Supabase RLS（逐表啟用 + 測試）：classes、students、conversations、messages、exercises、exercise_attempts、error_book、school_exams、school_exam_scores、embeddings_log
- RLS Policy 設計：老師只能看到自己班級的數據
- 前端註冊流程：新老師 → Supabase Auth 註冊 → 建立班級 → 邀請學生
- 學校管理入口：同一學校的老師共享學校級別設定
- 測試：用 2-3 個不同帳號驗證數據隔離

### 第 59-62 週：訂閱制收費（Stripe）（約 25 小時）

**目標：** 完整的收費流程——老師可以升級方案、付款、管理訂閱。

- `schools` 表新增訂閱欄位（ALTER TABLE）：plan、stripe_customer_id、stripe_subscription_id、plan_started_at、plan_expires_at、max_classes、max_students、monthly_ai_quota
- 建立 `usage_stats` 表
- API：`/api/billing/checkout` — 建立 Stripe Checkout Session
- API：`/api/billing/webhook` — 處理 Stripe 事件（付款成功/失敗/取消/續費）
- API：`/api/billing/status` — 查詢方案狀態和用量
- API：`/api/billing/portal` — 跳轉 Stripe Customer Portal
- `billing.ts` middleware — KV 快取方案狀態 + 配額檢查
- 前端：教師「方案與帳單」頁面（當前方案、用量進度、升級按鈕、帳單歷史）
- 免費版降級邏輯：AI 對話 500 次/月限制、Polly 降級為瀏覽器 TTS、進階功能關閉
- 用 Stripe 測試模式完整測試付款流程

**收費方案：**

| 方案 | 月費 | 班級上限 | 學生上限 | AI 對話 | 進階功能 |
|------|------|---------|---------|--------|---------|
| 免費試用 | HKD 0 | 1 | 30 | 500 次/月 | 基本練習 + 錯題本 |
| 基礎版 | HKD 300-500 | 3 | 90 | 無限 | 全部（含 Polly Neural） |
| 學校版 | HKD 1,000-2,000 | 無限 | 無限 | 無限 | 全部 + Power BI + 優先支援 |

### 第 63-66 週：管理員後台 Phase 3（約 25 小時）

**目標：** 管理員可以管理多校、多老師、帳單，AI 自動優化 prompt 和發現教學盲區。

**學校管理（`admin/Schools.tsx`）：**
- 學校列表（名稱、方案、老師數、學生數、月費、到期日）
- 新增/停用學校
- 設定方案配額
- 按學校分攤成本報表

**老師管理（`admin/Teachers.tsx`）：**
- 全平台老師列表（所屬學校、班級數、學生數）
- 重置密碼、停用帳號

**帳單管理（`admin/Billing.tsx`）：**
- 訂閱狀態總覽（各校方案、收入統計、逾期預警）
- 收入報表（MRR、退訂率）
- 手動調整方案（贈送延期等）

**系統日誌強化（`admin/Logs.tsx`）：**
- 完整錯誤日誌
- 審計日誌
- AI 安全攔截記錄

**Prompt A/B 測試（`admin/PromptABTest.tsx`）：**
- 建立 A/B 測試：選擇功能點 → 設定兩版 prompt → 設定分流比例
- 自動追蹤效果指標（答對率、學生回饋、錯題率）
- AI 每週分析哪個版本效果更好，建議勝出版本
- Cron：月度教學盲區分析（`teaching-gap.ts`）

**教學盲區發現（`admin/TeachingGaps.tsx`）：**
- 月度 Cron Trigger 自動分析
- 利用 Vectorize 搜索學生高頻問題 vs 教材覆蓋率
- 展示：未被教材覆蓋的高頻知識點列表 + AI 建議
- 提供「一鍵新增到教材庫」按鈕

### 第 67-70 週：更多年級內容 + 正式認證（約 25 小時）

- 與太太合作制定不同年級（P.1-P.6）的 prompt 調整策略
- 新增各年級的教學內容（課文嵌入 Vectorize、默書詞表、範疇練習題）
- 每個年級的 System Prompt 微調（詞彙複雜度、解釋深度）
- 如用戶量超過 100：升級為正式認證（學生帳號 + 密碼），取代班級代碼
- 如用戶量未超過 100：保持班級代碼登入，但加入前端 localStorage 持久化

### 第 71-72 週：法規合規 + 商業準備（約 15 小時）

- GPDP 登記準備（澳門個人資料保護辦公室）
- 撰寫隱私政策和使用條款
- 商業實體設立規劃（如需要向學校開發票）
- 數據處理協議模板（學校簽署用）

### 第 73-76 週：推廣測試 + 驗收（約 40 小時）

- 邀請太太學校的 2-3 位其他老師試用（免費方案）
- 各老師建立自己的班級、使用核心功能
- 驗證 RLS 數據隔離正常
- 至少有 1 位老師升級到基礎版（Stripe 流程驗證）
- 收集多位老師的回饋
- 用校內考試數據對比：平台用戶 vs 非用戶的成績差異
- Bug 修復、效能優化
- 管理員後台完整功能驗收

---

## 本階段新增/修改的資料庫表（3 新 + 1 修改，累計 22 張）

```sql
-- schools 表新增訂閱欄位
ALTER TABLE schools
  ADD COLUMN plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'school', 'custom')),
  ADD COLUMN stripe_customer_id TEXT,
  ADD COLUMN stripe_subscription_id TEXT,
  ADD COLUMN plan_started_at TIMESTAMPTZ,
  ADD COLUMN plan_expires_at TIMESTAMPTZ,
  ADD COLUMN max_classes INT DEFAULT 1,
  ADD COLUMN max_students INT DEFAULT 30,
  ADD COLUMN monthly_ai_quota INT DEFAULT 500;

-- 使用量統計表（每月一筆記錄）
CREATE TABLE usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id),
  month TEXT NOT NULL,
  ai_chat_count INT DEFAULT 0,
  tts_char_count INT DEFAULT 0,
  exercise_count INT DEFAULT 0,
  storage_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(school_id, month)
);

-- 即時測驗 Session（Phase 1 已有前端，Phase 3 獨立建表做跨校統計）
CREATE TABLE live_quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id),
  exercise_id UUID REFERENCES exercises(id),
  join_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'waiting',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 即時測驗作答記錄
CREATE TABLE live_quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES live_quiz_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id),
  question_index INT NOT NULL,
  answer TEXT NOT NULL,
  is_correct BOOLEAN,
  response_time_ms INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 本階段的 AI 功能

| AI 功能 | 模型/技術 | 用途 |
|---------|----------|------|
| 所有 Phase 0-2 AI 功能 | （延續） | （延續） |
| Prompt A/B 測試 | GPT-4o-mini (Cron) | 每週分析 A/B 測試效果，建議勝出 prompt |
| 教學盲區發現 | GPT-4o-mini + Vectorize (Cron) | 每月分析高頻問題 vs 教材覆蓋缺口 |
| 按學校成本分攤 | cost-tracker.ts | 多校場景下按 school_id 分攤 API 成本 |
| 訂閱配額管理 | billing middleware + KV | AI 對話配額控制和用量追蹤 |

**管理員 AI 增強功能的額外成本估算：**

| 功能 | 頻率 | 估計月成本 |
|------|------|-----------|
| 對話掃描（Phase 1） | 每晚 | < HKD 3 |
| 學生風險預警（Phase 2） | 每週 | < HKD 1 |
| 內容品質分析（Phase 2） | 每週 | < HKD 1 |
| Prompt A/B 判斷 | 每週 | < HKD 0.5 |
| 教學盲區分析 | 每月 | < HKD 2 |
| **合計** | | **< HKD 8/月** |

---

## 本階段成本估算

| 項目 | 費用（以太太的學校 ~300 學生為例） |
|------|------|
| Cloudflare Workers Paid | HKD 39 |
| Cloudflare（Pages + KV + R2 + Vectorize） | HKD 0 |
| Supabase（可能需升 Pro） | HKD 0-200 |
| Azure OpenAI（300 學生） | HKD 300-800 |
| Amazon Polly（首年後） | HKD 80-160 |
| 管理員 AI 自動化 | HKD 8 |
| Stripe 手續費（假設 5 校付費） | HKD 80-170 |
| Cursor Pro | HKD 160 |
| **運營成本合計** | **HKD 667-1,537** |
| **收入（假設 3 基礎 + 2 學校）** | **HKD 2,900-5,500** |
| **毛利率** | **~55-70%** |

---

## 驗收標準

### 場景一：新老師註冊使用

陳老師（太太的同事）聽說太太在用一個很好的中文教學平台。她打開網頁，用 Email 註冊帳號，建立「小四B班」，系統自動產生班級代碼 `4B2026`。她在「AI 出題」中貼入小四的課文，AI 生成適合四年級程度的練習。她無法看到太太的任何數據。太太也看不到陳老師的班級。

### 場景二：學校升級付費

太太的學校決定正式採購。太太在「方案與帳單」頁面點「升級到學校版」，跳轉到 Stripe 付款頁面，用學校公務卡付款 HKD 1,500/月。付款成功後，太太的帳號立刻解鎖所有進階功能（Power BI 整合、無限班級、優先支援）。學校的 AI 對話配額變為無限。你在管理員後台看到這筆新訂閱和收入。

### 場景三：Prompt A/B 測試

你在管理員後台建立一個 A/B 測試——測試閱讀理解的出題 prompt：A 版強調「先給提示再問」，B 版直接問。設定 50/50 分流。一週後，AI 分析報告顯示 A 版的學生答對率高 12%，建議採用 A 版。你點「確認勝出」，A 版自動成為預設 prompt。

### 場景四：教學盲區發現

月度 Cron 觸發教學盲區分析。管理員後台「教學盲區」頁面顯示：「本月學生最常問的 3 個知識點中，『量詞搭配』在教材庫中覆蓋率不足——只有 1 篇相關內容（匹配度 0.42）。建議新增量詞專題教材。」你點「一鍵新增到教材庫」，跳轉到內容管理頁面準備新增教材。

### 場景五：成本與收入管理

你打開管理員後台的帳單管理頁面。看到 MRR（月經常收入）HKD 3,500。5 所付費學校中 1 所即將到期。按學校分攤的成本報表顯示每所學校的 API 成本 vs 收入，毛利率 62%。有 1 所免費學校已用完 AI 對話配額，學生看到「本月額度已用完，請聯繫老師升級」的提示。

### Checklist

**多老師/多學校：**
- [ ] 新老師可以自行註冊帳號、建立班級
- [ ] RLS 已啟用——老師之間數據完全隔離
- [ ] 同一學校的老師可以共享學校級別設定
- [ ] 管理員可以新增/停用學校
- [ ] 管理員可以查看/停用老師帳號

**收費機制：**
- [ ] 三種方案（免費/基礎/學校）在 Stripe 中已建立
- [ ] 老師可以完成完整付款流程（升級 → Stripe Checkout → 付款 → 功能解鎖）
- [ ] Webhook 正確處理付款成功/失敗/取消/續費事件
- [ ] 方案狀態在 KV 快取中，API 請求檢查 < 1ms
- [ ] 免費版 AI 對話 500 次/月限制正常運作
- [ ] 免費版 Polly 降級為瀏覽器 TTS
- [ ] 老師可以在 Stripe Customer Portal 管理付款方式和查看發票
- [ ] 管理員帳單管理頁面顯示 MRR、訂閱狀態、逾期預警

**管理員後台 Phase 3：**
- [ ] 學校管理頁面正常運作
- [ ] 老師管理頁面正常運作
- [ ] 帳單管理顯示收入/成本/毛利
- [ ] 按學校分攤成本報表正確
- [ ] 系統日誌（錯誤/審計/安全攔截）可查詢

**AI 自動化：**
- [ ] Prompt A/B 測試可以建立、運行、查看結果
- [ ] AI 每週分析 A/B 測試效果並建議勝出版本
- [ ] 教學盲區月度分析正常運行
- [ ] 盲區結果可「一鍵新增到教材庫」
- [ ] 所有 Cron Trigger 正常觸發（可在 Cloudflare Dashboard 驗證）

**更多年級：**
- [ ] 至少 3 個年級的 prompt 和內容已準備
- [ ] 不同年級的 AI 回答複雜度有明顯差異
- [ ] 各年級的教材已嵌入 Vectorize

**合規與安全：**
- [ ] 隱私政策和使用條款已撰寫並上線
- [ ] GPDP 登記已申請或完成
- [ ] 數據處理協議模板已準備
- [ ] RLS 數據隔離通過測試（跨學校不能互看數據）

**推廣驗證：**
- [ ] 太太學校有 3+ 位老師在使用
- [ ] 每位老師管理自己的 2-3 個班
- [ ] 至少 1 位老師/學校完成了 Stripe 付費
- [ ] 有校內考試數據證明使用平台的班級成績提升
- [ ] 月度成本和收入達到可持續（毛利 > 50%）

---

## 進入後續迭代的前提條件

- [ ] 以上所有 Checklist 項目都已勾選
- [ ] 太太學校以外的學校表達了使用意願
- [ ] 有校內考試數據作為推廣時的「成功案例」
- [ ] 月度收入可以覆蓋運營成本（不依賴開發者個人補貼）
- [ ] 開發流程穩定、文檔完善，為引入技術合夥人做好準備

---

## 後續方向參考（Phase 3 後）

Phase 3 完成後，產品已具備收費能力和推廣基礎。後續可以考慮（不在本文件範圍）：

- 香港市場進入（PDPO 合規 + 香港課程）
- 多科目擴展（數學、英文）
- 語音互動（學生用語音輸入與 AI 對話）
- 家長帳號系統（取代匿名報告連結）
- 自動化營銷（學校演示、試用期管理）
- 進階 Analytics（AI 驅動的教學洞察報表）

詳見 architecture.md 5.7 長期願景。
