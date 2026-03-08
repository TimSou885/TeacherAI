#!/bin/bash
# 教案設計系統 第一～四階段 自動驗收
# 執行：./scripts/acceptance-verify.sh 或 npm run acceptance

set -e
cd "$(dirname "$0")/.."

PASS=0
FAIL=0
API_URL="${API_URL:-http://localhost:8787}"
WEB_URL="${WEB_URL:-http://localhost:5173}"

check() {
  local name="$1"
  local cmd="$2"
  local expect="${3:-0}"
  if eval "$cmd" >/dev/null 2>&1; then
    echo "  ✅ $name"
    ((PASS++)) || true
    return 0
  else
    echo "  ❌ $name"
    ((FAIL++)) || true
    return 1
  fi
}

check_status() {
  local name="$1"
  local url="$2"
  local expect="${3:-200}"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  if [ "$code" = "$expect" ]; then
    echo "  ✅ $name (HTTP $code)"
    ((PASS++)) || true
    return 0
  else
    echo "  ❌ $name (expected $expect, got $code)"
    ((FAIL++)) || true
    return 1
  fi
}

echo "=========================================="
echo "教案設計系統 自動驗收"
echo "=========================================="

echo ""
echo "【1】建置驗證"
check "Web 建置成功" "cd web && npm run build"
echo ""

echo "【2】API 路由（需先啟動: cd api && npm run dev）"
check_status "API 健康" "$API_URL/" "200"
check_status "lesson-texts（需登入→401）" "$API_URL/api/lesson-texts" "401"
check_status "lesson-plans（需登入→401）" "$API_URL/api/lesson-plans" "401"
check_status "classes（需登入→401）" "$API_URL/api/classes" "401"
echo ""

echo "【3】Web 頁面（需先啟動: cd web && npm run dev）"
check_status "首頁" "$WEB_URL/"
check_status "老師登入" "$WEB_URL/teacher/login"
check_status "AI 出題" "$WEB_URL/teacher/generate"
check_status "教案設計" "$WEB_URL/teacher/lesson-plan"
check_status "內容管理" "$WEB_URL/teacher/content"
check_status "學生登入" "$WEB_URL/student"
echo ""

echo "【4】SPA 路由（不 404）"
check_status "忘記密碼" "$WEB_URL/teacher/forgot-password"
check_status "重設密碼" "$WEB_URL/teacher/reset-password"
echo ""

echo "=========================================="
echo "結果：$PASS 通過，$FAIL 失敗"
echo "=========================================="

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "提示：若 API/Web 未啟動，請先執行："
  echo "  終端一: cd api && npm run dev"
  echo "  終端二: cd web && npm run dev"
  exit 1
fi
exit 0
