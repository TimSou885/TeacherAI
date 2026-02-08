import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authMiddleware } from './middleware/auth'
import { chatRoutes } from './routes/chat'
import { conversationRoutes } from './routes/conversations'
import { adminEmbedRoutes } from './routes/admin-embed'

export type Env = {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  SUPABASE_JWT_SECRET: string
  AZURE_OPENAI_API_KEY: string
  AZURE_OPENAI_ENDPOINT: string
  /** RAG：Vectorize index（1536 維、cosine），可選 */
  VECTORIZE?: { query: (v: number[], o?: { topK?: number; returnMetadata?: boolean }) => Promise<{ matches?: Array<{ id: string; score: number; metadata?: Record<string, unknown> }> }>; insert: (v: Array<{ id: string; values: number[]; metadata?: Record<string, string> }>) => Promise<unknown> }
  /** 嵌入腳本用：POST /api/admin/embed 時帶此 secret，可選 */
  ADMIN_EMBED_SECRET?: string
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
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
)

app.options('*', (c) => c.body(null, 204))
app.get('/', (c) => c.json({ name: 'eduspark-api', status: 'ok' }))

app.use('/api/chat', authMiddleware)
app.use('/api/conversations', authMiddleware)
app.route('/api', chatRoutes)
app.route('/api', conversationRoutes)
app.route('/api/admin', adminEmbedRoutes)

export default app
