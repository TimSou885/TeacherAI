# API 依賴安全說明

## 目前 audit 結果（4 個 moderate）

- **esbuild**：僅影響 `wrangler dev` 本機開發伺服器，不影響 `wrangler deploy` 上線的 Worker。
- **undici**：被 Wrangler 的本地模擬（miniflare）使用，僅限開發環境。

**結論：** 正式環境（Cloudflare Workers）不受影響。若只在本機 localhost 跑開發，可接受不修復。

## 若要升級修復

修復需升級到 Wrangler 4（breaking change），可自行嘗試：

```bash
cd api
npm install wrangler@latest --save-dev
npm audit
```

升級後若 `wrangler dev` 或 `wrangler deploy` 有行為差異，再依 [Wrangler 遷移文件](https://developers.cloudflare.com/workers/wrangler/migration/) 調整。
