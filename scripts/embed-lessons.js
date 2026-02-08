/**
 * Phase 0 RAG：讀取 content/*.txt，切分段落後 POST 到 /api/admin/embed
 * 使用方式：
 *   1. 建立 Vectorize index：npx wrangler vectorize create teacherai-embeddings --dimensions=1536 --metric=cosine
 *   2. 在 wrangler.toml 取消註解 [[vectorize]] 並設定 index_name
 *   3. 設定 secret：set ADMIN_EMBED_SECRET=你的密碼（.dev.vars 或 wrangler secret）
 *   4. 本機：先 npm run dev（api），再 node scripts/embed-lessons.js
 *   5. 遠端：node scripts/embed-lessons.js https://teacherai.xxx.workers.dev 你的ADMIN_EMBED_SECRET
 *
 * 環境變數（可選）：ADMIN_EMBED_SECRET、API_BASE_URL（預設 http://127.0.0.1:8787）
 */
const fs = require('fs')
const path = require('path')
const http = require('http')
const https = require('https')

const CONTENT_DIR = path.join(__dirname, '..', 'content')
const DEV_VARS_PATH = path.join(__dirname, '..', 'api', '.dev.vars')
const MAX_CHUNK = 600 // 單段最長字數，過長再切

/** 從 api/.dev.vars 讀取 ADMIN_EMBED_SECRET（bat 未傳入時 fallback） */
function readSecretFromDevVars() {
  try {
    if (!fs.existsSync(DEV_VARS_PATH)) return ''
    let content = fs.readFileSync(DEV_VARS_PATH, 'utf8').replace(/^\uFEFF/, '')
    const line = content.split(/\r?\n/).find((l) => l.startsWith('ADMIN_EMBED_SECRET='))
    if (!line) return ''
    const value = line.slice(line.indexOf('=') + 1).trim()
    return value
  } catch {
    return ''
  }
}

function toChunks(text) {
  const trimmed = text.replace(/\r\n/g, '\n').trim()
  if (!trimmed) return []
  const byParagraph = trimmed.split(/\n\n+/)
  const chunks = []
  for (const p of byParagraph) {
    const t = p.trim()
    if (!t) continue
    if (t.length <= MAX_CHUNK) {
      chunks.push(t)
    } else {
      for (let i = 0; i < t.length; i += MAX_CHUNK) {
        chunks.push(t.slice(i, i + MAX_CHUNK))
      }
    }
  }
  return chunks
}

function loadLessonFiles() {
  if (!fs.existsSync(CONTENT_DIR)) {
    console.error('content/ 目錄不存在，請建立 content/*.txt')
    process.exit(1)
  }
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.txt'))
  if (files.length === 0) {
    console.error('content/ 下沒有 .txt 檔案')
    process.exit(1)
  }
  const out = []
  for (const f of files) {
    const full = path.join(CONTENT_DIR, f)
    const text = fs.readFileSync(full, 'utf8')
    const chunks = toChunks(text)
    const base = path.basename(f, '.txt')
    chunks.forEach((c, i) => out.push({ id: `${base}-${i + 1}`, text: c }))
  }
  return out
}

function post(baseUrl, secret, chunks) {
  const url = new URL('/api/admin/embed', baseUrl)
  const body = JSON.stringify({ chunks })
  const isHttps = url.protocol === 'https:'
  const port = url.port || (isHttps ? 443 : 80)
  const options = {
    hostname: url.hostname,
    port,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'X-Admin-Embed-Secret': secret,
    },
  }
  return new Promise((resolve, reject) => {
    const req = (isHttps ? https : http).request(options, (res) => {
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {}
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(json)
          else reject(new Error(json.message || data || `HTTP ${res.statusCode}`))
        } catch {
          reject(new Error(data || `HTTP ${res.statusCode}`))
        }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

function main() {
  const apiBase = process.env.API_BASE_URL || process.argv[2] || 'http://127.0.0.1:8787'
  const isLocal = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(apiBase.replace(/\/$/, ''))
  const fileSecret = readSecretFromDevVars()
  let secret = (process.argv[3] || process.env.ADMIN_EMBED_SECRET || '').trim()
  let secretSource = process.argv[3] ? 'argv' : 'env'
  if (fileSecret && (isLocal || !secret)) {
    secret = fileSecret
    secretSource = 'api/.dev.vars'
  } else if (!secret) {
    secret = fileSecret
    if (secret) secretSource = 'api/.dev.vars'
  }
  if (!secret) {
    console.error('請在 api\\.dev.vars 設定 ADMIN_EMBED_SECRET=你的密碼，或傳入第二個參數')
    process.exit(1)
  }
  const chunks = loadLessonFiles()
  console.log(`讀取 ${chunks.length} 個段落，API: ${apiBase}，密鑰來源: ${secretSource}，長度: ${secret.length}`)
  post(apiBase, secret, chunks)
    .then((r) => console.log('成功:', r))
    .catch((e) => {
      console.error('失敗:', e.message)
      if (e.code === 'ECONNREFUSED') {
        console.error('')
        console.error('本機 API 未啟動。請先執行 start-api.bat，看到 Ready 後再跑本腳本。')
      }
      if (e.message === 'Unauthorized') {
        console.error('')
        if (/^https:\/\//.test(apiBase)) {
          console.error('遠端 API 密鑰不符。請在 api 目錄執行：')
          console.error('  npx wrangler secret put ADMIN_EMBED_SECRET')
          console.error('並輸入與 api\\.dev.vars 中 ADMIN_EMBED_SECRET 完全相同的值。')
        } else {
          console.error('密鑰不符。請確認 api\\.dev.vars 有 ADMIN_EMBED_SECRET=...')
          console.error('若有修改過 .dev.vars，請關閉 API 視窗後重新執行 start-api.bat，再跑本腳本。')
        }
      }
      if (e.message && e.message.includes('VECTORIZE')) {
        console.error('')
        console.error('本機 wrangler dev 不提供 Vectorize 綁定，請改對「已部署的 API」嵌入：embed-lessons-remote.bat')
      }
      if (e.message && (e.message.includes('404') || e.message === 'Not Found')) {
        console.error('')
        console.error('API 回傳 404。請在專案根目錄執行 deploy-api.bat（會 cd api 並 npx wrangler deploy）')
        console.error('部署完成後再執行 embed-lessons-remote.bat。')
      }
      process.exit(1)
    })
}

main()
