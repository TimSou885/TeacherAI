# Phase 2：好用 + 對齊校內考試（第 31-54 週，約 180 小時）

> **前置文件：** 完整技術棧、Schema、Prompt 設計見 [architecture.md](architecture.md)
> **前置階段：** [Phase 0](phase-0.md) + [Phase 1](phase-1.md) 的所有驗收項目已通過

---

## 目標一句話

用真實的校內考試分數證明平台有效——經常使用平台的學生和不使用的學生，在校內考試中有可觀察的成績差異。

---

## 本階段開發的功能清單

| # | 功能 | 說明 | 對應 architecture.md |
|---|------|------|---------------------|
| 1 | 校內成績記錄與分析 | 太太輸入考試分數 → 系統分析 + AI 解讀 | 2.10 |
| 2 | 模擬紙本考試模式 | 限時、無提示、接近紙本格式 | 2.11 |
| 3 | 考後試卷分析 | 輸入各大題得分 → AI 弱項診斷 → 一鍵生成考後複習 | 2.12 |
| 4 | 前測/後測效果衡量 | 同一內容前後測對比 + AI 進步解讀 | 2.13 |
| 5 | 作文批改 | GPT-4o 按評分標準批改 + 太太審核 | 2.7（作文） |
| 6 | 家長學習報告 | 一頁式報告：校內成績 + 使用量 + AI 個人化建議 | 4.3 |
| 7 | AI 課堂決策支援 | 即時測驗中根據答對率生成教學建議（可選） | 2.14 |
| 8 | 管理員後台 Phase 2 | AI 內容預審、成本優化建議、學生風險預警、系統配置 | 4.6 |
| 9 | 學習進度追蹤 | 校內成績趨勢圖 + 錯題解決率趨勢 | 5.2 |
| 10 | 安全加固 | Azure Content Safety 精細化配置 | 3.6（安全） |
| 11 | Power BI 整合 | 預建 View + 連線文件 | 4.5 |
| 12 | UI/UX 改進 | 根據 Phase 1 太太和學生回饋調整 | — |

---

## 週次分解

### 第 31-33 週：校內成績記錄與分析（約 25 小時）

- 建立 `school_exams` 和 `school_exam_scores` 表
- API：`/api/exam` 路由（建立考試、輸入分數、查詢分析）
- 前端：`Exams.tsx`（校內成績記錄頁——新增考試、輸入分數、支援批量貼上）
- 前端：`ExamDetail.tsx`（單次考試分析——班級平均、分佈、與上次對比、範疇得分率）
- AI 班級成績解讀（GPT-4o-mini 生成自然語言摘要 + 下週教學建議）
- 「平台使用量 vs 考試成績」對比圖
- 所有成績數據可匯出 CSV

### 第 34-35 週：模擬考試模式（約 15 小時）

- 前端：模擬考試介面（限時倒計時、無即時回饋、接近紙本格式）
- 排句成段改為數字編號輸入（非拖放）
- 配對題改為下拉選單
- 太太操作：建立練習 → 勾選「模擬考試」→ 設限時 → 設開放時段 → 發佈

### 第 36-37 週：考後試卷分析（約 15 小時）

- API：`/api/exam-analyze` 路由（接收各大題得分 → 分析 → 生成考後複習）
- 前端：`ExamAnalysis.tsx`（輸入試卷結構和分數 → 顯示失分分析 → 一鍵生成複習）
- AI 個人化弱項診斷（GPT-4o-mini 為每個學生生成一句建議）
- 一鍵生成考後複習練習（AI 根據失分點自動出題）

### 第 38-41 週：作文批改（約 30 小時）

- API：`/api/writing` 路由（接收作文文字/照片 → GPT-4o 批改 → 回傳分項評分）
- 前端：學生 `Writing.tsx`（提交作文——打字或拍照上傳）
- 作文拍照上傳 → R2 存儲 → 可選 OCR（或直接打字）
- GPT-4o 按澳門小學評分標準批改：內容 40% + 語言 30% + 結構 30%
- 太太審核介面：查看 AI 批改結果 → 修改分數/評語 → 確認發佈
- 作文批改 System Prompt（見 architecture.md 3.4）

### 第 42-44 週：家長學習報告（約 20 小時）

- 前端：`parent/Report.tsx`（一頁式、手機友好、不需要登入）
- 第一區：校內成績（分數 + 趨勢 + 排名）
- 第二區：平台使用情況 + AI 學伴觀察摘要（GPT-4o-mini 根據對話記錄生成）
- 第三區：AI 個人化下一步建議（GPT-4o-mini 根據分項得分和錯題生成）+ 太太評語
- API：生成唯一報告連結（UUID），太太管理連結

### 第 45-46 週：管理員後台 Phase 2（約 15 小時）

- 建立 `student_risk_alerts`、`admin_audit_log` 表
- 前端：`admin/Content.tsx`（AI 內容預審——品質評分 + Prompt 改進建議）
- 前端：`admin/Alerts.tsx`（學生風險預警——高風險/關注列表 + 通知老師）
- 前端：`admin/Config.tsx`（系統配置——模型切換、功能開關、Prompt 版本、預算）
- 前端：`admin/Logs.tsx`（基本系統日誌）
- Cron：每週一學生風險掃描（`student-risk-scan.ts`）
- Cron：每週五內容品質分析（`content-quality.ts`）
- `admin/CostMonitor.tsx` 增加 AI 成本優化建議區塊
- `billingMiddleware` 準備（見 architecture.md 5.9，但 Phase 2 只做框架不啟用收費）

### 第 47-49 週：前測/後測 + 學習進度 + Power BI（約 20 小時）

- 前測/後測：建立測驗時可勾選「前測」或「後測」→ 自動對比 + AI 進步解讀
- 學習進度追蹤：每個學生的校內成績趨勢圖 + 錯題解決率趨勢圖
- Power BI 預建 View（v_student_scores、v_class_exam_trends、v_platform_usage、v_error_stats）
- Power BI 連線文件（Supabase PostgreSQL 直連說明）

### 第 50-52 週：UI/UX 改進 + 安全加固（約 20 小時）

- 根據 Phase 1 太太和學生回饋調整 UI（字體、顏色、操作流程...）
- Azure Content Safety 精細化配置（按兒童場景調整攔截等級）
- AI 課堂決策支援（即時測驗中根據答對率生成建議——可選功能）
- 全面測試和 bug 修復

### 第 53-54 週：持續使用 + 驗收

- 太太持續使用，至少記錄 2 次校內考試成績
- 分析「平台使用量 vs 校內成績」數據
- 驗證作文批改是否真的省時間
- 收集家長對報告的回饋

---

## 本階段新增的資料庫表（4 張，累計 18 張）

```sql
-- 10. 校內考試
CREATE TABLE school_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id),
  subject TEXT NOT NULL DEFAULT 'chinese',
  title TEXT NOT NULL,
  exam_type TEXT NOT NULL,
  exam_date DATE NOT NULL,
  total_score NUMERIC(5,1) DEFAULT 100,
  sections JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. 校內考試成績
CREATE TABLE school_exam_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES school_exams(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id),
  total_score NUMERIC(5,1),
  section_scores JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(exam_id, student_id)
);

-- 20. 管理操作審計日誌
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES admin_users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 22. 學生風險預警表
CREATE TABLE student_risk_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('high', 'medium')),
  reasons TEXT[] NOT NULL,
  suggestion TEXT,
  status TEXT DEFAULT 'pending',
  scan_week TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

（完整 SQL 含索引見 architecture.md 附錄 A）

---

## 本階段的 AI 功能

| AI 功能 | 模型/技術 | 用途 |
|---------|----------|------|
| 所有 Phase 0-1 AI 功能 | （延續） | （延續） |
| 班級成績解讀 | GPT-4o-mini | 根據考試分數生成自然語言班級解讀 + 教學建議 |
| 個人弱項診斷 | GPT-4o-mini | 考後為每個學生生成個人化弱項建議 |
| 考後複習出題 | GPT-4o-mini | 根據全班失分點自動生成針對性複習 |
| 前後測解讀 | GPT-4o-mini | 生成班級/個人前後測進步解讀 |
| 作文批改 | GPT-4o | 按澳門小學評分標準分項批改 + 具體批註 |
| 家長報告觀察 | GPT-4o-mini | 根據對話記錄生成 AI 學伴觀察摘要 |
| 家長報告建議 | GPT-4o-mini | 根據分項得分 + 錯題生成個人化下一步建議 |
| 課堂決策支援 | GPT-4o-mini | 根據即時答對率生成教學建議（可選） |
| 內容預審 | GPT-4o-mini | AI 出題後先預評品質 |
| Prompt 改進建議 | GPT-4o (Cron) | 分析被拒內容，建議 prompt 修改 |
| 成本優化建議 | GPT-4o-mini | 分析 API 使用模式，建議模型路由優化 |
| 學生風險預警 | GPT-4o-mini (Cron) | 每週識別高風險學生 |

---

## 本階段成本估算

| 項目 | 費用 |
|------|------|
| Cloudflare（全部服務） | HKD 0 |
| Supabase | HKD 0 |
| Azure OpenAI（含 GPT-4o 作文批改） | HKD 200-400 |
| Amazon Polly | HKD 15-40 |
| Cursor Pro | HKD 160 |
| **合計** | **HKD 375-600** |

注：作文批改使用 GPT-4o（較貴），每篇約 2,000 input + 1,000 output tokens。60 篇作文/月約 HKD 30-50。

---

## 驗收標準

### 場景一：考試成績分析

太太考完期中考、改完卷後，打開「成績記錄」頁面，選擇「期中考」，輸入 30 個學生的分數（批量貼上 Excel）。儲存後，頁面頂部顯示 AI 生成的班級解讀：「本次期中考班級平均 72.5 分，較上次進步 4.5 分。閱讀理解是最弱範疇...建議下週加強推斷題練習。」下方是成績趨勢圖、使用量 vs 成績對比、每個學生的分數列表。太太點「匯出 CSV」。

### 場景二：考後複習

太太在考後分析頁面輸入各大題分值和範疇，再輸入每個學生的各大題得分。系統顯示「全班失分最多：標點符號 45%、推斷題 52%」。每個學生旁邊有 AI 生成的一句弱項建議。太太點「一鍵生成考後複習」，AI 自動出一套標點 + 推斷題的複習練習，太太審核後發佈。學生做的每一題都針對考試暴露的弱點。

### 場景三：作文批改

學生在「作文」Tab 看到太太出的題目，打字寫完一篇 200 字的作文，提交。10 秒後收到 AI 批改結果：內容 32/40、語言 24/30、結構 22/30，總分 78。每段有具體批註（「這裡可以用更具體的形容詞」「標點需要修正」）。太太在儀表板看到 AI 批改結果，微調了一處評語，確認發佈。學生看到最終版。整個批改過程太太花了 3 分鐘（傳統需要 15 分鐘）。

### 場景四：家長報告

太太為小明生成報告連結，通過微信發給家長。家長在手機打開，第一眼看到「期中考 78 分（上次 68 分，進步 10 分）」。第二區看到「本週使用平台 5 次、錯題已掌握 11/15 個」。第三區看到 AI 建議「加強閱讀理解推斷題」+ 太太的評語「小明很認真，下學期有信心更好」。

### 場景五：管理員後台升級

你打開管理後台，「AI 內容審核」頁面顯示本月 AI 出題通過率 81%，語文基礎類最低（72%），AI 建議調整 prompt 中的選項設計要求。「學生風險預警」顯示 3 位學生需要關注——小紅連續 3 週錯誤率超過 40%，AI 建議通知太太安排個別輔導。「系統配置」頁面可以切換 AI 模型和調整功能開關。

### Checklist

**校內成績：**
- [ ] 太太可以建立校內考試記錄（類型 + 日期 + 分數）
- [ ] 支援批量貼上分數（Excel → 平台）
- [ ] 班級成績分析正確（平均/最高/最低/及格率/趨勢）
- [ ] AI 班級成績解讀正常生成（自然語言 + 教學建議）
- [ ] 「平台使用量 vs 考試成績」對比圖正確
- [ ] 成績可匯出 CSV

**模擬考試：**
- [ ] 限時倒計時正常運作
- [ ] 無即時回饋（做完才顯示結果）
- [ ] 排句成段用數字輸入（非拖放）
- [ ] 太太可以設定開放時間段

**考後分析：**
- [ ] 全班失分分析正確（按大題/範疇排序）
- [ ] 每個學生有 AI 個人化弱項建議
- [ ] 「一鍵生成考後複習」正常運作
- [ ] 生成的複習題針對失分點

**作文批改：**
- [ ] 學生可以打字或拍照提交作文
- [ ] GPT-4o 按三維度評分（內容/語言/結構）
- [ ] 有具體的段落批註
- [ ] 太太可以修改分數和評語
- [ ] 太太確認後學生才看到最終結果

**家長報告：**
- [ ] 報告連結不需登入即可查看
- [ ] 第一眼是校內考試分數和趨勢
- [ ] AI 個人化建議正確（基於分項得分和錯題）
- [ ] 手機上排版正常

**管理員後台 Phase 2：**
- [ ] AI 內容預審正常運作（出題前先品質檢查）
- [ ] Prompt 改進建議正常生成（每週 Cron）
- [ ] 成本優化建議區塊正常顯示
- [ ] 學生風險預警正常（每週一 Cron 掃描）
- [ ] 系統配置可即時修改且 KV 快取生效
- [ ] 審計日誌記錄管理操作

**前後測 + 進度：**
- [ ] 前測/後測可以對比，AI 生成進步解讀
- [ ] 每個學生有校內成績趨勢圖
- [ ] 錯題解決率趨勢圖正常

**Power BI：**
- [ ] 4 個 View 已建立（v_student_scores、v_class_exam_trends、v_platform_usage、v_error_stats）
- [ ] Power BI Desktop 可以直連 Supabase 讀取 View

---

## 進入 Phase 3 的前提條件

- [ ] 以上所有 Checklist 項目都已勾選
- [ ] 太太至少記錄了 2 次校內考試成績
- [ ] 數據顯示「經常使用平台的學生成績明顯好於不使用的」
- [ ] 考後分析 → 複習 → 下次考試進步的閉環至少跑通 1 次
- [ ] 作文批改讓太太的批改時間減少 50% 以上
- [ ] 太太願意把家長報告發給家長
- [ ] 太太學校有其他老師表達了使用興趣（推廣需求存在）
- [ ] 月度成本在預算範圍內（HKD 500 以內）
