# EduSpark – Agent Instructions

Entry points and docs: see `.cursor/rules/project-conventions.mdc`.

## Cursor Cloud specific instructions

### Services overview

| Service | Command | Port | Notes |
|---------|---------|------|-------|
| Web (Vite/React) | `cd web && npm run dev` | 5173 | Proxies `/api` to API server |
| API (Hono/Wrangler) | `cd api && npm run dev` | 8787 | Runs via Miniflare locally |

### Environment files (not committed)

- `web/.env` — needs `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Set `VITE_API_URL=http://localhost:8787` for local dev. See `web/.env.example`.
- `api/.dev.vars` — needs Supabase, Azure OpenAI, and optionally AWS Polly keys. See `api/.dev.vars.example`.

### Build & type-check

- **Web**: `cd web && npx tsc -b` (clean) then `npx vite build`.
- **API**: `cd api && npx tsc --noEmit`. Note: the API has pre-existing TS errors that do not block `wrangler dev` (Wrangler uses its own bundler).

### Gotchas

- No eslint or lint config exists in the repo; there is no `lint` npm script.
- No automated test framework is configured (no Jest/Vitest/Playwright).
- Wrangler 3 is used (pinned in `api/package.json`). It will warn about being outdated but works fine.
- Vectorize bindings are not available locally; they connect to remote in production only.
- R2 bucket (`R2_TTS`) is simulated locally by Miniflare — no external setup needed.
- The root `package.json` is minimal (only `aws4fetch` + `hanzi-writer`); real deps live in `web/` and `api/`.
- Authentication requires valid Supabase credentials. Without real keys, login flows will fail at the API level, but the frontend renders correctly.
- **Stale workerd processes**: When restarting `wrangler dev`, the old `workerd` child process may not terminate and keeps holding port 8787. Use `lsof -i :8787` to find and `kill` the stale PID before restarting. The new wrangler instance will start on a random internal port if 8787 is occupied.
- The API has 5 pre-existing TypeScript errors (type mismatches in `index.ts`, `admin-embed.ts`, `exercises.ts`, `score.ts`, `conversation-scan.ts`). These do not block `wrangler dev` since it uses its own bundler.
- Student login flow uses class join codes (e.g., `3A2026`) + student selection — no password needed. Teacher login uses Supabase Auth (email/password). There is no teacher signup page; teacher accounts must be created in the Supabase dashboard.
