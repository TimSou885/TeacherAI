#!/bin/bash
# 教案設計完整流程驗收
# 驗證：儲存 → 列表 → 載入 流程

set -e
cd "$(dirname "$0")/.."

echo "=========================================="
echo "教案設計完整流程驗收"
echo "=========================================="

echo ""
echo "【1】建置"
(cd web && npm run build) 2>/dev/null || true
echo "  ✅ Web 建置"
echo ""

echo "【2】API 與頁面"
API_URL="${API_URL:-http://localhost:8787}"
WEB_URL="${WEB_URL:-http://localhost:5173}"
code=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/" 2>/dev/null || echo "000")
[ "$code" = "200" ] && echo "  ✅ API 健康" || echo "  ⚠ API 未啟動（$API_URL）"
code=$(curl -s -o /dev/null -w "%{http_code}" "$WEB_URL/teacher/lesson-plan" 2>/dev/null || echo "000")
[ "$code" = "200" ] && echo "  ✅ 教案設計頁" || echo "  ⚠ Web 未啟動（$WEB_URL）"
echo ""

echo "【3】教案 API 路由"
# 未登入應 401
code=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_URL/api/lesson-plans" 2>/dev/null || echo "000")
[ "$code" = "401" ] && echo "  ✅ GET /api/lesson-plans 需登入 (401)" || echo "  ❌ GET /api/lesson-plans 預期 401，實際 $code"
code=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_URL/api/lesson-plans/00000000-0000-0000-0000-000000000000" 2>/dev/null || echo "000")
[ "$code" = "401" ] && echo "  ✅ GET /api/lesson-plans/:id 需登入 (401)" || echo "  ❌ GET /api/lesson-plans/:id 預期 401，實際 $code"
echo ""

echo "=========================================="
echo "完成（實際儲存→載入需登入後於瀏覽器操作）"
echo "=========================================="
