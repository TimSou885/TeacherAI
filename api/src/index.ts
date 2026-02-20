import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authMiddleware } from './middleware/auth'
import { authRoutes } from './routes/auth'
import { chatRoutes } from './routes/chat'
import { conversationRoutes } from './routes/conversations'
import { ttsRoutes } from './routes/tts'
import { exerciseRoutes } from './routes/exercises'
import { scoreRoutes } from './routes/score'
import { errorBookRoutes } from './routes/error-book'
import { generateRoutes } from './routes/generate'
import { teacherRoutes } from './routes/teacher'
import { liveRoutes } from './routes/live'
import { adminEmbedRoutes } from './routes/admin-embed'
import { runConversationScan } from './scheduled/conversation-scan'

export type Env = {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  SUPABASE_JWT_SECRET: string
  AZURE_OPENAI_API_KEY: string
  AZURE_OPENAI_ENDPOINT: string
  /** 學生 JWT 簽名用（Phase 1 學生登入） */
  STUDENT_JWT_SECRET?: string
  /** Polly 語音：AWS 金鑰與區域（Phase 1 默書） */
  AWS_ACCESS_KEY_ID?: string
  AWS_SECRET_ACCESS_KEY?: string
  AWS_REGION?: string
  /** R2 快取 TTS 音頻（Phase 1），binding 名稱 R2_TTS */
  R2_TTS?: R2Bucket
  /** RAG：Vectorize index（1536 維、cosine），可選 */
  VECTORIZE?: { query: (v: number[], o?: { topK?: number; returnMetadata?: boolean }) => Promise<{ matches?: Array<{ id: string; score: number; metadata?: Record<string, unknown> }> }>; insert: (v: Array<{ id: string; values: number[]; metadata?: Record<string, string> }>) => Promise<unknown> }
  /** 嵌入腳本用：POST /api/admin/embed 時帶此 secret，可選 */
  ADMIN_EMBED_SECRET?: string
}

interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>
  put(key: string, value: ArrayBuffer | ReadableStream, options?: R2PutOptions): Promise<void>
}
interface R2ObjectBody {
  arrayBuffer(): Promise<ArrayBuffer>
  body: ReadableStream
}
interface R2PutOptions {
  httpMetadata?: { contentType?: string }
}

const app = new Hono<{ Bindings: Env }>()

app.use(
  '*',
  cors({
    origin: [
      'http://localhost:5173',
      'https://eduspark.pages.dev',
      'https://teacherai.pages.dev',
    ],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
)

app.options('*', (c) => c.body(null, 204))
app.get('/', (c) => c.json({ name: 'eduspark-api', status: 'ok' }))

app.route('/api/auth', authRoutes)

app.use('/api/tts', async (c, next) => {
  if (c.req.method === 'POST') return authMiddleware(c, next)
  return next()
})
app.route('/api', ttsRoutes)

app.use('/api/chat', authMiddleware)
app.use('/api/conversations', authMiddleware)
app.use('/api/conversations/*', authMiddleware)
app.use('/api/exercises', authMiddleware)
app.use('/api/score', authMiddleware)
app.use('/api/error-book', authMiddleware)
app.use('/api/generate', authMiddleware)
app.use('/api/classes', authMiddleware)
app.use('/api/teacher', authMiddleware)
app.route('/api/live', liveRoutes)
app.route('/api', chatRoutes)
app.route('/api', conversationRoutes)
app.route('/api', exerciseRoutes)
app.route('/api', scoreRoutes)
app.route('/api', errorBookRoutes)
app.route('/api', generateRoutes)
app.route('/api/teacher', teacherRoutes)
app.route('/api/admin', adminEmbedRoutes)

export default {
  fetch: app.fetch,
  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    ctx.waitUntil(
      runConversationScan(env).then((r) => {
        if (r.scanned > 0) console.log('conversation-scan:', r)
      })
    )
  },
}
