import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authMiddleware } from './middleware/auth'
import { chatRoutes } from './routes/chat'
import { conversationRoutes } from './routes/conversations'

export type Env = {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  SUPABASE_JWT_SECRET: string
  AZURE_OPENAI_API_KEY: string
  AZURE_OPENAI_ENDPOINT: string
}

const app = new Hono<{ Bindings: Env }>()

app.use(
  '*',
  cors({
    origin: ['http://localhost:5173', 'https://eduspark.pages.dev'],
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
)

app.get('/', (c) => c.json({ name: 'eduspark-api', status: 'ok' }))

app.use('/api/chat', authMiddleware)
app.use('/api/conversations', authMiddleware)
app.route('/api', chatRoutes)
app.route('/api', conversationRoutes)

export default app
