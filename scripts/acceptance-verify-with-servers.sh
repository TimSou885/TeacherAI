#!/bin/bash
# 教案設計系統 自動驗收（含啟動服務）
# 執行：./scripts/acceptance-verify-with-servers.sh

set -e
cd "$(dirname "$0")/.."

API_PORT=8787
WEB_PORT=5173
API_URL="http://localhost:$API_PORT"
WEB_URL="http://localhost:$WEB_PORT"

cleanup() {
  echo ""
  echo "清除背景程序…"
  [ -n "$API_PID" ] && kill $API_PID 2>/dev/null || true
  [ -n "$WEB_PID" ] && kill $WEB_PID 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT

echo "【0】建置"
(cd web && npm run build) || exit 1
echo ""

echo "【0】啟動 API (port $API_PORT)"
(cd api && npm run dev) &
API_PID=$!
echo "【0】啟動 Web (port $WEB_PORT)"
(cd web && npm run dev) &
WEB_PID=$!

echo "等待服務就緒…"
for i in $(seq 1 30); do
  if curl -s -o /dev/null "$API_URL/" 2>/dev/null && curl -s -o /dev/null "$WEB_URL/" 2>/dev/null; then
    echo "服務已就緒"
    break
  fi
  sleep 1
  if [ $i -eq 30 ]; then
    echo "逾時：服務未啟動"
    exit 1
  fi
done
sleep 2
echo ""

export API_URL WEB_URL
./scripts/acceptance-verify.sh
exit $?
