# EduSpark – Agent Reference

Entry points: `web/src` (React frontend), `api/src` (Hono API on Cloudflare Workers).
Design & architecture: `architecture.md`, phase docs in root.

## Cursor Cloud specific instructions

### Services

| Service | Directory | Dev command | Port |
|---------|-----------|-------------|------|
| Frontend (React + Vite) | `web/` | `npm run dev` | 5173 |
| API (Hono + Wrangler) | `api/` | `npm run dev` | 8787 |

The Vite dev server proxies `/api` to `http://localhost:8787`. The frontend also directly calls `http://localhost:8787` when `VITE_API_URL` is empty (default in dev).

### Lint / Type-check

No ESLint or Prettier is configured. Use TypeScript as the lint check:
- **Frontend:** `cd web && npx tsc --noEmit`
- **API:** `cd api && npx tsc --noEmit` (has pre-existing type errors that do not block `wrangler dev`)

### Build

- **Frontend:** `cd web && npm run build` (runs `tsc -b && vite build`, outputs to `web/dist/`)

### Environment variables

- **Frontend** (`web/.env`): copy `web/.env.example` → `web/.env` and fill in `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Leave `VITE_API_URL` empty for local dev.
- **API secrets**: set via `npx wrangler secret put <NAME>` in `api/`. Required: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`. Optional: `STUDENT_JWT_SECRET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `ADMIN_EMBED_SECRET`.

### Gotchas

- There are three separate `package-lock.json` files (root, `web/`, `api/`). Run `npm install` in each directory independently.
- The API uses wrangler v3. Wrangler may warn about compatibility date being ahead of its supported range; this does not block local dev.
- `*.md` is in `.gitignore`. Use `git add -f AGENTS.md` to track this file.
- No automated test suite exists; validation is via TypeScript checks and manual browser testing.
- External services (Supabase, Azure OpenAI) require real credentials. Without them, the frontend renders fully but auth/AI features will fail at runtime.
