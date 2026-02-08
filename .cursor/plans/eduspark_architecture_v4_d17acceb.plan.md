---
name: EduSpark Architecture V4
overview: "Create the complete improved EduSpark AI architecture document (V4) incorporating all feedback from the critique: realistic timelines, cold-start design, teacher experience depth, performance budgets, educational quality SLOs, architecture diagrams, and revised business model."
todos:
  - id: write-ch1-2
    content: 撰寫第 1-2 章：產品願景與技術架構（含 Mermaid 系統總覽圖、事件流圖）
    status: pending
  - id: write-ch3
    content: 撰寫第 3 章：效能預算與 SLO（新章節，含延遲分解表）
    status: pending
  - id: write-ch4-5
    content: 撰寫第 4-5 章：認知引擎與學習體驗設計（含冷啟動 CAT 設計）
    status: pending
  - id: write-ch6
    content: 撰寫第 6 章：教師體驗設計（新章節）
    status: pending
  - id: write-ch7-8
    content: 撰寫第 7-8 章：知識圖譜與安全合規
    status: pending
  - id: write-ch9-11
    content: 撰寫第 9-11 章：商業模型、GTM、教育成效框架（含修正定價）
    status: pending
  - id: write-ch12-19
    content: 撰寫第 12-19 章：營運、團隊、路線圖、依賴、技術債、風險、ADR、名詞（含修正時間線和 DAG 圖）
    status: pending
isProject: false
---

# EduSpark AI 完整改善架構文件（第四版）

## 概述

基於第三版架構文件和全面評審反饋，產出整合所有改進的第四版架構文件。文件將以 Markdown 格式寫入 `architecture.md`。

## 核心改進清單（相對第三版的變更）

### A. 時間線與範圍調整

- Phase 1 從 4 個月延長至 6 個月，或縮減範圍（Phase 1 只做數學，英文推至 Phase 1.5）
- 認知引擎 Phase 1 只上 BKT，IRT 和間隔重複推至 Phase 1.5
- 每個 Phase 的里程碑加入更細的週粒度分解

### B. 新增章節：冷啟動與診斷性入學測驗

- 新用戶首次登入的 CAT（Computerized Adaptive Testing）診斷測驗設計
- 10-15 分鐘自適應測驗快速建立初始知識模型
- 無歷史數據時段落流程的降級方案

### C. 新增章節：教師體驗設計（與學生體驗同等深度）

- 教師三大核心工作流：備課、上課、課後
- 班級掌握度分佈視覺化
- 個別學生介入建議（不只數據，要有行動建議）
- 與校內系統（eClass、Grwth）的數據銜接策略

### D. 效能預算表

- 端到端延遲目標分解到每個子系統
- AI 對話互動：認知引擎查詢 → RAG 檢索 → Prompt 組裝 → LLM 首 token 的毫秒級預算
- 教師儀表板：資料庫查詢 → 聚合計算 → 渲染的預算

### E. 教育品質 SLO

- AI 教學準確性 SLO
- 知識追蹤校準 SLO
- 策略有效性 SLO
- 與技術 SLO 並列的監控儀表板

### F. 事件驅動的「同步快速路徑」修正

- BKT 更新改為「同步前端預計算 + 非同步後端完整更新」
- 解決最終一致性對學生體驗的影響

### G. 知識圖譜品質自動化檢查

- 前置依賴一致性檢查
- 題目難度統計校準
- 知識點覆蓋度檢查
- 人工審核前的自動過濾層

### H. 即時更新粒度與節流策略

- 教師儀表板班級概覽 30 秒聚合
- 個別學生詳細頁即時更新
- Supabase Realtime 訂閱粒度設計

### I. 商業模型修正

- 基礎版定價重新評估（HKD 38 → HKD 48 或功能精簡）
- 寫作批改成本獨立估算
- 暑假「降級到免費版」取代「暫停訂閱」
- 按功能分解的成本結構表

### J. 數據可攜性技術方案

- 學校退出時的結構化數據匯出（xAPI / CSV+JSON）
- 學生轉校的數據遷移流程

### K. 中文 NLP 與分詞策略

- 粵語口語、中英混用、繁簡混用的分詞評估
- 自定義詞典建設計劃

### L. 架構圖（Mermaid）

- 系統總覽圖
- 事件流圖
- 模組依賴 DAG 圖
- 學習段落流程圖
- 認知引擎整合邏輯圖

### M. 知識圖譜查詢效能

- PostgreSQL recursive CTE 的限制標記
- 預計算常見遍歷路徑的快取策略
- Phase 2 評估 Apache AGE 或 Neo4j

### N. 多科目交叉學習

- 多科目段落的體驗設計
- 科目切換時的狀態保存與恢復機制

## 文件結構（十九章）

1. 產品願景與定位（含競品分析、不做清單）
2. 技術架構（含架構總覽圖、前端、後端、多租戶、事件驅動）
3. 效能預算與 SLO（新章節）
4. 認知引擎
5. 學習體驗設計（含冷啟動、段落流程、考試、寫作批改）
6. 教師體驗設計（新章節）
7. 知識圖譜與內容管線
8. 安全、合規與倫理
9. 商業模型（含修正定價和成本分解）
10. 市場進入策略
11. 教育成效框架
12. 可觀測性與營運（含教育品質 SLO）
13. 團隊架構與擴展
14. 分階段路線圖（修正時間線）
15. 模組依賴關係（含 DAG 圖）
16. 技術債與已知限制
17. 風險登記冊
18. 架構決策記錄（ADR）
19. 名詞解釋

## 產出

- 單一檔案 `architecture.md`，約 25,000-30,000 字
- 內含 5+ 張 Mermaid 架構圖
- 所有改進點整合到對應章節中

