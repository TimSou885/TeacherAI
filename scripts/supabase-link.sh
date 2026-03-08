#!/bin/bash
# 連結 Supabase 專案
# 使用方式：
#   SUPABASE_PROJECT_REF=你的專案REF ./scripts/supabase-link.sh
# 或
#   ./scripts/supabase-link.sh 你的專案REF
#
# 專案 REF 取得方式：Supabase Dashboard → Project Settings → General → Reference ID
# 或從 VITE_SUPABASE_URL 取得：https://[專案REF].supabase.co

set -e
cd "$(dirname "$0")/.."

REF="${1:-$SUPABASE_PROJECT_REF}"
if [ -z "$REF" ]; then
  echo "用法：SUPABASE_PROJECT_REF=xxx ./scripts/supabase-link.sh"
  echo "  或：./scripts/supabase-link.sh 你的專案REF"
  echo ""
  echo "專案 REF 在 Supabase Dashboard → Project Settings → General"
  exit 1
fi

npx supabase link --project-ref "$REF"
echo ""
echo "連結成功。執行 migration：npm run db:migrate"
