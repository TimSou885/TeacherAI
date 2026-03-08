#!/bin/bash
# 使用 DATABASE_URL 直接執行 migration（不需 supabase login）
#
# 使用方式：
#   DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres" ./scripts/run-migration-with-url.sh
#
# DATABASE_URL 取得：Supabase Dashboard → Project Settings → Database → Connection string → URI

set -e
cd "$(dirname "$0")/.."

if [ -z "$DATABASE_URL" ]; then
  echo "請設定 DATABASE_URL"
  echo "例：DATABASE_URL=\"postgresql://postgres.xxx:密碼@aws-0-xx.pooler.supabase.com:6543/postgres\" ./scripts/run-migration-with-url.sh"
  exit 1
fi

echo "執行 migration..."
npx supabase db push --db-url "$DATABASE_URL"
echo "完成。"
