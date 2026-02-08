---
name: Split MD by Phase
overview: "Keep architecture.md as the master overview, create 4 new phase-specific markdown files (phase-0.md ~ phase-3.md) each containing: scope, weekly breakdown, feature details extracted from the main md, database tables needed, AI features, and acceptance criteria in both scenario + checklist format."
todos:
  - id: phase-0
    content: "Create phase-0.md: env setup + AI chat + RAG basics"
    status: completed
  - id: phase-1
    content: "Create phase-1.md: student features + teacher dashboard + admin P1"
    status: completed
  - id: phase-2
    content: "Create phase-2.md: exam alignment + essay + parent report + admin P2"
    status: completed
  - id: phase-3
    content: "Create phase-3.md: multi-school + billing + admin P3 + AI automation"
    status: completed
  - id: update-main
    content: Add Phase file index to architecture.md Part 5
    status: completed
isProject: false
---

# Split architecture.md into Phase-based Development Guides

## Approach

- `**architecture.md**` remains the master document (no content removed), with a new "Phase 文件索引" section at the top of Part 5 linking to the 4 phase files
- **4 new files**: `phase-0.md`, `phase-1.md`, `phase-2.md`, `phase-3.md`
- Each phase file is a **self-contained development guide** for that phase, with cross-references back to architecture.md for shared details (Schema, Prompt, tech stack)

## Each Phase File Structure

```
# Phase X: [名稱]（第 N-M 週，約 Y 小時）

## 目標一句話
## 本階段開發的功能清單
## 週次分解（每週要做什麼）
## 功能詳細規格（從 architecture.md 對應章節提取關鍵資訊）
## 本階段需要的資料庫表
## 本階段的 AI 功能
## 驗收標準
  - 場景描述（太太/學生/你 的操作場景）
  - Checklist（可勾的 [ ] 項目）
## 本階段完成後的成本估算
## 進入下一階段的前提條件
```

## Phase Breakdown

### phase-0.md: 能對話（第 1-8 週）

- Features: env setup, React SPA skeleton, Workers API skeleton, AI chat with streaming, RAG basics
- Tables: schools, classes, conversations, messages, embeddings_log (5 tables)
- Acceptance: scenario + checklist for "太太能跟 AI 對話"

### phase-1.md: 能用（第 9-30 週）

- Features: student login, dictation + Polly, HanziWriter, quiz framework (6 categories), error book, AI auto-generate, teacher dashboard, classroom mode, admin Phase 1, cold start, mobile design
- Tables: students, exercises, exercise_attempts, error_book, ai_generated_content, admin_users, api_cost_log, system_config, conversation_flags (9 new tables)
- Acceptance: scenario + checklist for "太太的 2-3 個班連續使用 2 週"

### phase-2.md: 好用 + 校內考試（第 31-54 週）

- Features: school exam records, mock exam, post-exam analysis, essay grading, parent report, admin Phase 2, student risk alerts, learning progress
- Tables: school_exams, school_exam_scores, student_risk_alerts, admin_audit_log (4 new tables)
- Acceptance: scenario + checklist for "校內考試成績證明有效"

### phase-3.md: 能推廣（第 55-76 週）

- Features: multi-teacher, multi-school, subscription billing, admin Phase 3, Prompt A/B, teaching gap, more grades, RLS
- Tables: curriculum_terms, live_quiz_sessions, live_quiz_answers, usage_stats + schools ALTER (3 new + 1 altered)
- Acceptance: scenario + checklist for "3+ 老師使用，有校內考試數據"

## Changes to architecture.md

- Add a "Phase 開發指南索引" section at the start of Part 5 linking to the 4 files

