# Phase 0：能對話（第 1-8 週，約 65 小時）

> **前置文件：** 完整技術棧、Schema、Prompt 設計見 [architecture.md](architecture.md)

---

## 目標一句話

太太打開網頁，能跟 AI 用繁體中文對話，AI 的回答基本靠譜——不會說錯字、不會用簡體、語氣適合小學生。

---

## 本階段開發的功能清單

| # | 功能 | 說明 | 對應 architecture.md |
|---|------|------|---------------------|
| 1 | Cloudflare + Supabase 環境搭建 | 帳號、數據庫、KV、R2、Vectorize、Azure OpenAI、AWS Polly 全部建好 | 附錄 B |
| 2 | React SPA 前端骨架 | Vite + React Router + Tailwind + shadcn/ui，首頁、導航、登入頁 | 1.9 項目結構 |
| 3 | Workers API 骨架 | Hono 路由、JWT 認證中介軟體、Supabase 連線、CORS | 1.9 項目結構 |
| 4 | 老師登入（Supabase Auth） | Email + 密碼登入，取得 JWT | 2.1 |
| 5 | AI 對話頁面 | 聊天氣泡、串流回應、對話記錄保存 | 2.4 |
| 6 | Azure OpenAI 串流整合 | Workers 呼叫 Azure OpenAI，TransformStream 轉發串流 | 2.4 |
| 7 | 基礎 System Prompt | 「小明老師」角色、繁體中文、適合小學生語氣 | 3.2 |
| 8 | RAG 基礎 | 嵌入課文到 Vectorize，對話時搜索相關教材注入 prompt | 2.7 |
| 9 | 部署上線 | 前端 → Cloudflare Pages，API → Cloudflare Workers | 1.11 |

---

## 週次分解

### 第 1-2 週：環境搭建（約 16 小時）

**目標：** 所有帳號就位、空項目能部署到 Cloudflare。

- 建立 GitHub 私有倉庫 `eduspark`
- 建立 Cloudflare 帳號 → 建立 KV namespace、R2 bucket
- 建立 Supabase 項目（Southeast Asia 區域）→ 執行建表 SQL（Phase 0 只需 5 張表）
- 建立 Azure OpenAI 資源（East Asia 區域）→ 部署 `gpt-4o-mini` + `text-embedding-3-small`
- 取得 AWS Polly IAM 權限（Access Key）
- 用 Vite 建立 React 前端項目（`web/`）：`npm create vite@latest web -- --template react-ts`
- 安裝 Tailwind CSS + shadcn/ui
- 用 Wrangler 建立 Workers 項目（`api/`）：`npm create cloudflare@latest api`
- 安裝 Hono
- 設定環境變數（`web/.env` + `api/wrangler.toml` + wrangler secrets）
- 部署空項目到 Cloudflare Pages 和 Workers，確認能存取

**Cursor 提示：** `"Set up a Vite React TypeScript project with Tailwind CSS and shadcn/ui, create basic App.tsx with React Router"`

### 第 3-5 週：前端 UI + API 骨架 + AI 對話（約 25 小時）

**目標：** 太太能登入、跟 AI 對話、看到串流回應。

- 前端：建立首頁、導航欄、登入頁（Supabase Auth SDK）
- 前端：建立 AI 對話頁面——輸入框、對話氣泡組件、歷史對話列表
- API：建立 Hono 入口、JWT 認證中介軟體（驗證 Supabase JWT）、CORS 中介軟體
- API：建立 `/api/chat` 路由——接收訊息、呼叫 Azure OpenAI、串流回傳
- API：建立 `azure-openai.ts` 服務封裝（Chat + Embeddings）
- 實現對話記錄保存（寫入 `conversations` + `messages` 表）
- 實現對話歷史讀取（前端展示歷史對話列表）
- 撰寫基礎 System Prompt（`api/src/subjects/chinese/prompts/chat-system.ts`）

**Cursor 提示：**
- `"Create a React chat component with streaming responses from an API endpoint, displaying messages in chat bubbles with Tailwind CSS and shadcn/ui"`
- `"Create a Hono route that calls Azure OpenAI chat completions with streaming and forwards the stream to the client"`

### 第 6-8 週：RAG 基礎 + 太太試用 + 調整（約 24 小時）

**目標：** AI 對話有教材依據，太太覺得回答品質可以接受。

- 建立 Vectorize index（1536 維，cosine similarity）
- 準備 2-3 篇太太提供的課文，用 `text-embedding-3-small` 生成向量
- 建立嵌入腳本：切分課文 → 生成 embedding → 插入 Vectorize → 記錄到 `embeddings_log`
- 修改 `/api/chat` 路由：對話前先查 Vectorize → 取 top 3 相關段落 → 注入 system prompt
- 建立 `vectorize.ts` 服務封裝
- 太太試用 1 週，記錄 AI 回答的問題（用簡體、語氣不對、知識錯誤...）
- 根據太太回饋修改 prompt 和 RAG 策略
- 確保部署流程順暢：前端推 GitHub 自動部署、API 用 wrangler deploy

### 可選：API 依賴安全與 Wrangler 升級

`npm install` 後若在 `api/` 執行 `npm audit` 出現 moderate 漏洞（esbuild、undici），這些僅影響本機開發環境（`wrangler dev`），**不影響正式部署**（`wrangler deploy` 跑在 Cloudflare 邊緣）。Phase 0 可選擇不修復。

若要修復並升級 Wrangler，請依 **`api/SECURITY-AUDIT.md`** 操作：

1. 進入 API 目錄：`cd api`
2. 升級 Wrangler：`npm install wrangler@latest --save-dev`
3. 檢查：`npm audit`
4. 確認本機與部署正常：`npm run dev`、`npx wrangler deploy`
5. 若行為有差異，參考 [Wrangler 遷移文件](https://developers.cloudflare.com/workers/wrangler/migration/) 調整

詳見 `api/SECURITY-AUDIT.md`。

---

## 本階段需要的資料庫表（5 張）

Phase 0 只需要建立以下 5 張表。其餘表在後續 Phase 需要時再建：

```sql
-- 1. 學校（Phase 0 只插入一筆太太的學校）
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  region TEXT DEFAULT 'macau',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 班級（Phase 0 建表但不需要學生登入，太太先建好班級結構）
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id),
  name TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT 'chinese',
  join_code TEXT UNIQUE NOT NULL,
  teacher_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 對話記錄
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID,  -- Phase 0 暫時為 NULL（太太自己測試用）
  subject TEXT DEFAULT 'chinese',
  title TEXT,
  mode TEXT DEFAULT 'chat',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 對話訊息
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. 向量嵌入追蹤
CREATE TABLE embeddings_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id UUID,
  class_id UUID REFERENCES classes(id),
  subject TEXT NOT NULL DEFAULT 'chinese',
  content_text TEXT NOT NULL,
  vector_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX idx_conversations_student ON conversations(student_id);
CREATE INDEX idx_conversations_subject ON conversations(subject);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at);
CREATE INDEX idx_classes_school ON classes(school_id);
CREATE INDEX idx_embeddings_class ON embeddings_log(class_id, subject);
CREATE INDEX idx_embeddings_content ON embeddings_log(content_type, content_id);
```

---

## 本階段的 AI 功能

| AI 功能 | 模型/技術 | 用途 |
|---------|----------|------|
| AI 中文對話 | GPT-4o-mini（串流） | 學生/太太與 AI 用繁體中文對話 |
| RAG 知識注入 | text-embedding-3-small + Vectorize | 將課文嵌入向量庫，對話時檢索注入 prompt |
| 內容安全 | Azure Content Safety（內建） | 自動攔截不當輸入/輸出 |

---

## 本階段成本估算

| 項目 | 費用 |
|------|------|
| Cloudflare（Pages + Workers + KV + R2 + Vectorize） | HKD 0 |
| Supabase（DB + Auth） | HKD 0 |
| Azure OpenAI（太太一人測試，用量極少） | HKD 5-20 |
| Amazon Polly | HKD 0（Phase 0 不用） |
| Cursor Pro | HKD 160 |
| **合計** | **HKD 165-180** |

---

## 驗收標準

### 場景一：太太登入並對話

太太打開 `https://eduspark.pages.dev`，用 Email + 密碼登入。進入 AI 對話頁面，輸入「『溫暖』是什麼意思？」，AI 在 2 秒內開始逐字回覆，用繁體中文、適合小學生的語氣解釋詞義。太太接著問「可以造個句子嗎？」，AI 用「溫暖」造一個適合小三學生的句子。整個對話保存在歷史記錄中，太太下次登入還能看到。

### 場景二：RAG 教材回答

太太已經嵌入了第五課的課文。她在對話中問「第五課的主角去了什麼地方？」，AI 能根據 Vectorize 搜索到的課文內容，準確回答課文中的細節，而不是編造答案。

### 場景三：安全過濾

太太測試輸入一些無關的問題（如「告訴我一個恐怖故事」），AI 禮貌地拒絕並引導回中文學習。

### Checklist

**環境搭建：**
- [ ] GitHub 倉庫已建立，Cursor 可以正常推送
- [ ] Cloudflare 帳號就緒：Pages 項目、Workers 項目、KV namespace、R2 bucket 都已建立
- [ ] Supabase 項目就緒：5 張表已建立、能在 SQL Editor 中查詢
- [ ] Azure OpenAI 就緒：`gpt-4o-mini` 和 `text-embedding-3-small` 已部署、API Key 有效
- [ ] AWS Polly IAM 權限已取得（Phase 0 暫不使用，但先準備好）

**前端：**
- [ ] 首頁可以在 `https://eduspark.pages.dev` 存取
- [ ] 太太可以用 Email + 密碼登入
- [ ] AI 對話頁面有輸入框、發送按鈕、對話氣泡
- [ ] AI 回覆是逐字串流顯示的（不是一次跳出整段）
- [ ] 對話歷史列表可以展開查看之前的對話
- [ ] 手機上排版不會壞（基本 RWD）

**API：**
- [ ] Workers API 可以在 `https://eduspark-api.xxx.workers.dev` 存取
- [ ] JWT 驗證正常運作（沒有 JWT 的請求被拒絕）
- [ ] CORS 設定正確（前端可以跨域呼叫 API）
- [ ] `/api/chat` 路由正常回傳串流回應

**AI 對話品質：**
- [ ] AI 全程使用繁體中文（不會混入簡體字）
- [ ] AI 語氣適合小學生（不會太複雜、不會居高臨下）
- [ ] AI 回答中文知識問題基本正確（字義、造句、語法）
- [ ] AI 遇到無關問題會禮貌拒絕並引導回中文學習
- [ ] AI 回答有教材依據（RAG 有效——問課文內容能答出來）

**RAG：**
- [ ] 至少 2 篇課文已嵌入 Vectorize
- [ ] `embeddings_log` 表有對應記錄
- [ ] 對話中問課文相關問題，AI 能引用課文內容回答

**部署：**
- [ ] 前端推送到 GitHub `main` 分支後自動部署到 Cloudflare Pages
- [ ] API 執行 `wrangler deploy` 能成功部署
- [ ] 太太在家的手機/電腦都能正常使用

---

## 進入 Phase 1 的前提條件

- [ ] 以上所有 Checklist 項目都已勾選
- [ ] 太太已經試用至少 1 週，回饋已記錄
- [ ] 太太覺得 AI 的回答「基本靠譜」——不需要完美，但不能有明顯的知識錯誤
- [ ] 部署流程順暢，你能獨立完成前端和 API 的部署
- [ ] 你對 React + Hono + Supabase + Azure OpenAI 的開發流程已經熟悉
