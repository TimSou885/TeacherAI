---
name: Admin AI Enhancement
overview: 在管理員後台 4.6 節中加入 AI 增強功能，Phase 1 聚焦「對話自動標記」和「AI 週報摘要」，Phase 2/3 逐步加入內容預審、成本優化建議、學生風險預警、Prompt 自動迭代。
todos:
  - id: phase1-conversation-ai
    content: Rewrite Phase 1 conversation audit to be AI-auto-flag first (nightly batch + risk score + flagged-only default view)
    status: completed
  - id: phase1-dashboard-ai
    content: Add AI natural language summary to Phase 1 dashboard page description
    status: completed
  - id: phase2-ai-features
    content: "Add Phase 2 AI features: content pre-review, cost optimization suggestions, student risk alerts"
    status: completed
  - id: phase3-ai-features
    content: "Add Phase 3 AI features: prompt A/B testing, teaching gap detection"
    status: completed
  - id: update-summary-table
    content: Update the Phase summary table to reflect all AI enhancements
    status: completed
  - id: update-schema
    content: Add conversation_flags or ai_flag fields to schema, add Cron Trigger to architecture
    status: completed
isProject: false
---

# Admin AI Enhancement Plan

## Analysis

Current admin panel (Section 4.6 in [architecture.md](d:\課堂AI V2\architecture.md)) is a traditional CRUD + statistics panel with zero AI utilization. This conflicts with the platform's AI-first positioning. We need to layer AI capabilities progressively.

## Phase 1 AI Enhancements (2 features, most practical)

### 1. AI Conversation Auto-Flag (`/admin/conversations`)

**Why Phase 1**: Children's safety is non-negotiable. Manually reviewing thousands of conversations is impossible for a solo developer. This is both a safety feature and a quality assurance tool.

- Workers runs a **nightly batch job** (or triggered via Cron Trigger) that scans new conversations with GPT-4o-mini
- Auto-flags: knowledge errors (wrong Chinese facts), off-topic drift, student emotional distress, safety concerns
- Generates per-conversation risk score (0-10) stored in the `conversations` table
- Admin dashboard only shows flagged conversations by default, not all conversations
- Estimated cost: ~0.5 USD/month for nightly analysis of 50-100 daily conversations

### 2. AI Dashboard Summary (`/admin/`)

**Why Phase 1**: Near-zero development effort, high value for a solo developer who checks the dashboard once a day.

- On dashboard page load, call GPT-4o-mini with today's aggregated stats (JSON) and ask it to generate a 3-5 sentence natural language summary
- Highlights anomalies, trends, and actionable suggestions
- Cache the summary in KV for 1 hour to avoid repeated calls
- Example output: "Today 42 students were active (+8% vs last week). Dictation practice usage surged in Class 3A ahead of next week's test. 2 conversations were flagged for review -- one potential knowledge error about stroke order."

## Phase 2 AI Enhancements (mark as future)

- **AI Content Pre-Review**: GPT-4o-mini pre-scores AI-generated exercises before teacher review, flags low-quality items, suggests prompt improvements based on rejection patterns
- **Cost Optimization Suggestions**: AI analyzes usage patterns, recommends model routing optimizations (e.g., "simple Q&A routed to GPT-4o could use GPT-4o-mini instead")
- **Student Risk Alerts**: AI identifies at-risk students (declining engagement, persistent errors, emotional signals) and generates intervention suggestions for the teacher

## Phase 3 AI Enhancements (mark as future)

- **AI-Driven Prompt A/B Testing**: Auto-track student outcomes per prompt version, suggest rollback or iteration
- **Teaching Gap Detection**: Vectorize-powered analysis of what students frequently ask that isn't in the curriculum, surfaced as "missing content" suggestions

## Files to modify

- [architecture.md](d:\課堂AI V2\architecture.md) Section 4.6: Update all 3 Phase subsections to integrate AI features
  - Phase 1: Rewrite conversation audit page to be AI-first; add AI summary to dashboard
  - Phase 2: Add AI pre-review to content audit; add cost optimization + student risk alert descriptions
  - Phase 3: Add prompt A/B testing and teaching gap detection
  - Update the Phase summary table at the end of 4.6
  - Add `ai_flag` fields to conversations table or a new `conversation_flags` table
  - Add Cron Trigger mention to the Workers architecture
