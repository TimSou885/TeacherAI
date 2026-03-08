#!/bin/bash
# PPT 教案匯出 階段 1（PoC）自動驗收
# 執行：./scripts/acceptance-verify-ppt-poc.sh

set -e
cd "$(dirname "$0")/.."

PASS=0
FAIL=0

check() {
  local name="$1"
  local cmd="$2"
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

echo "=========================================="
echo "PPT 教案匯出 階段 1（PoC）自動驗收"
echo "=========================================="

echo ""
echo "【1】依賴與模組"
check "pptxgenjs 已安裝" "test -f web/node_modules/pptxgenjs/package.json"
check "exportPpt.ts 存在" "test -f web/src/lib/exportPpt.ts"
check "exportPptPoc 函數存在" "grep -q 'exportPptPoc' web/src/lib/exportPpt.ts"
check "exportPptFromLessonPlan 函數存在" "grep -q 'exportPptFromLessonPlan' web/src/lib/exportPpt.ts"
check "教案頁含 匯出 PPT 按鈕" "grep -q '匯出 PPT' web/src/pages/teacher/LessonPlan.tsx"
echo ""

echo "【2】PptxGenJS 中文匯出驗證"
# 用 Node 執行 PptxGenJS 產生含中文的 PPT，驗證函式庫可用
TMP_PPT="/tmp/ppt-poc-$$.pptx"
if node -e "
const PptxGenJS = require('./web/node_modules/pptxgenjs/dist/pptxgen.cjs.js');
const pptx = new PptxGenJS();
const slide = pptx.addSlide();
slide.addText('測試中文：耳朵上的綠星星', { x: 0.5, y: 1, w: 9, fontFace: '微軟正黑體', fontSize: 24, lang: 'zh-TW' });
pptx.writeFile({ fileName: '$TMP_PPT' }).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
" 2>/dev/null; then
  if [ -f "$TMP_PPT" ] && [ "$(wc -c < "$TMP_PPT")" -gt 1000 ]; then
    echo "  ✅ PptxGenJS 可產出含中文的 .pptx"
    ((PASS++)) || true
    rm -f "$TMP_PPT"
  else
    echo "  ❌ 產出的 PPT 檔案無效或過小"
    ((FAIL++)) || true
    rm -f "$TMP_PPT"
  fi
else
  echo "  ❌ PptxGenJS 執行失敗"
  ((FAIL++)) || true
  rm -f "$TMP_PPT"
fi
echo ""

echo "【3】Web 建置（含 PPT 模組）"
check "Web 建置成功" "cd web && npm run build"
echo ""

echo "=========================================="
echo "結果：$PASS 通過，$FAIL 失敗"
echo "=========================================="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
