# CorpMind — AI-Powered Corporate Learning & Knowledge Platform

> **Build with AI EdTech Hackathon** · Track: **Corporate Education** · Demo client: **SQB Bank** (Uzbekistan)
> Languages: Uzbek (default), Russian, English. Stack: NestJS + TypeScript (strict), React + Vite, PostgreSQL/pgvector, Redis, OpenAI.

CorpMind solves four costly workforce-education problems in one connected learning loop:

> **Onboarding** introduces knowledge → **Knowledge Assistant** reinforces it → **Simulator** tests application → **Knowledge Memory** preserves it permanently.

The platform is generic (multi-tenant, white-label, industry-configurable). SQB Bank is one configured deployment.

---

## Live demo (local)

```bash
# Prerequisites: Docker, Node >= 20.18, pnpm >= 9, an OpenAI API key
cp .env.example apps/api/.env          # then set OPENAI_API_KEY in apps/api/.env
pnpm install
pnpm demo:bootstrap                    # Postgres+pgvector & Redis, schema, seed, ingest SQB docs
pnpm dev                               # API → http://localhost:4000  ·  Web → http://localhost:5173
```

Sign in at **http://localhost:5173** (password for all demo users: **`Demo123!`**):

| Email | Role | Try |
|---|---|---|
| `bekzod@sqb.uz` | Employee | Onboarding Day 1 + quiz · KB chat (cited) · Simulator (roleplay + score) · ask **Aziz Karimov** persona · 🎤 voice in / 🔊 voice out |
| `malika@sqb.uz` | Manager | Team overview · skill-gap / knowledge-risk reports |
| `nigora@sqb.uz` | HR Admin | Document upload + ingestion status · settings (industry switch) · users |

> Without `OPENAI_API_KEY` the app still runs and all seeded data is browsable; only live AI generation (chat, scoring, persona, voice, embedding) is disabled and degrades gracefully.

---

## Features (and where to verify them in code)

Judges can cross-check every claim below against the cited files and API routes.

| # | Feature | What it does | Backend (apps/api/src) | Key API routes (`/api/v1`) | Frontend (apps/web/src) |
|---|---|---|---|---|---|
| 1 | **Smart Onboarding** | Role-based day-by-day program, AI companion grounded in the day's docs, quizzes with grading | `onboarding/` | `GET /me/onboarding`, `POST /me/onboarding/days/:dayId/start`, `POST /me/onboarding/days/:dayId/complete`, `POST /me/onboarding/companion/ask` (SSE), `onboarding/templates*` | `features/onboarding/` |
| 2 | **Knowledge Assistant (RAG)** | Document-grounded streamed answers with source citations + suggested next step | `kb/`, `ai/rag/`, `ai/embeddings/` | `POST /kb/ask` (SSE), `GET /kb/conversations`, `GET /kb/conversations/:id/messages`, `POST /kb/messages/:id/rate` | `features/kb/` |
| 3 | **Documents + ingestion** | Upload PDF/DOCX → chunk → embed → pgvector; status tracking | `documents/`, `documents/ingest.worker.ts` | `POST /documents`, `GET /documents`, `GET /documents/:id`, `DELETE /documents/:id`, `POST /documents/:id/reprocess` | `features/admin/DocumentsPage.tsx` |
| 4 | **Roleplay Simulator** | AI persona roleplay (SSE) + gpt-4o 5-dimension scoring + Knowledge Bridge | `simulator/`, `scenarios/` | `GET /scenarios`, `POST /simulator/sessions`, `POST /simulator/sessions/:id/turn` (SSE), `POST /simulator/sessions/:id/end`, `GET /simulator/sessions/:id/score`, `GET /me/simulator/history` | `features/simulator/` (incl. SVG radar `RadarScore.tsx`) |
| 5 | **Employee Knowledge Memory** | Notes, projects, AI **persona** (first-person RAG over the person's own knowledge), who-knows, AI offboarding interview | `memory/`, `memory.util.ts` | `GET/POST /projects`, `GET/POST/PATCH/DELETE /notes*`, `GET /personas`, `POST /personas/:id/ask` (SSE), `GET /who-knows`, `offboarding/interviews*` | `features/memory/` |
| 6 | **Manager & Admin Dashboard** | Team overview (status colors), skill-gap, knowledge-risk, most-asked, employee timeline, platform analytics | `dashboard/`, `dashboard-status.ts` | `GET /dashboard/team-overview`, `/dashboard/skill-gap`, `/dashboard/knowledge-risk`, `/dashboard/most-asked`, `/dashboard/employee/:id`, `/admin/analytics/overview` | `features/dashboard/` |
| 7 | **Admin configuration** | User management, document upload UI, scenario list, onboarding templates, projects, tenant branding/industry | `admin/` (+ `users/`, `tenants/`) | `GET/POST /users`, `PATCH /users/:id/status`, `PATCH /admin/settings`, `GET /tenants/me` | `features/admin/` |
| 8 | **Gamification** | Points, badges, leaderboard — derived from real activity (onboarding/KB/sim/notes) | `gamification/`, `gamification.util.ts` (+ unit test) | `GET /me/points`, `GET /me/badges`, `GET /leaderboard` | `features/gamification/` (PointsPill, BadgesStrip, LeaderboardPage) |
| 9 | **Notifications** | In-app bell + list, mark read, demo seeding | `notifications/` | `GET /me/notifications`, `POST /me/notifications/:id/read`, `POST /me/notifications/mark-all-read`, `POST /me/notifications/seed-demo` | `features/notifications/` (NotificationBell) |
| 10 | **Voice input (STT)** | Speak a question → Whisper transcription → fills the chat input | `voice/` | `POST /voice/transcribe` (multipart audio) | `features/voice/MicButton.tsx` (in KB + persona) |
| 11 | **Voice output (TTS)** | Read AI answers aloud (OpenAI text-to-speech) | `voice/` | `POST /voice/speak` → `audio/mpeg` | `features/voice/SpeakButton.tsx` (in KB + persona) |
| — | **Auth & multi-tenant** | JWT access + rotating refresh, role guards, tenant-scoped Prisma extension via AsyncLocalStorage | `auth/`, `prisma/tenant-extension.ts`, `common/request-context.ts` | `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `GET /auth/me`, `PATCH /auth/me/lang` | `lib/api/`, `features/auth/` |
| — | **i18n** | Uzbek (default) / Russian / English across the whole UI | — | — | `i18n/` (8 namespaces × 3 langs) |
| — | **Health / ops** | Liveness incl. Postgres + Redis; AI token/cost telemetry + daily budget guard | `health/`, `ai/telemetry.service.ts` | `GET /health` | — |

5 user roles exist in the schema: `EMPLOYEE, MANAGER, HR_ADMIN, PLATFORM_ADMIN, KNOWLEDGE_CURATOR`.

---

## AI disclosure

All AI runs through **OpenAI** (single provider), funneled through `apps/api/src/ai/`. Models are env-configurable (`OPENAI_MODEL_*`).

| Capability | Model / approach | Code |
|---|---|---|
| KB chat, onboarding companion, simulator roleplay, persona answers | `gpt-4o-mini` (SSE streaming) | `kb/`, `simulator/`, `memory/`, `onboarding/` |
| Simulator scoring, offboarding question generation | `gpt-4o` (JSON mode, Zod-validated, 1 retry) | `simulator/`, `memory/` |
| Embeddings (document + persona chunks) | `text-embedding-3-small` (1536-dim, Redis-cached) | `ai/embeddings/` |
| Voice input (speech-to-text) | `whisper-1` | `voice/` |
| Voice output (text-to-speech) | `gpt-4o-mini-tts` | `voice/` |
| **Retrieval (RAG)** | **Hybrid**: pgvector cosine **+** PostgreSQL `tsvector` keyword, fused with **Reciprocal Rank Fusion** (k=60), top-5 | `ai/rag/` (`vector-search.ts`, `keyword-search.ts`, `fusion.ts`, `rag.service.ts`) |
| **Persona memory** | RAG over each employee's own `PersonaChunk` index + first-person voice prompt + confidence threshold | `memory/memory.service.ts` |

- **Prompts**: `apps/api/src/ai/prompts/` (KB-answer with citation rules, roleplay, scoring rubric, persona voice, offboarding interviewer, language policy).
- **Datasets**: synthetic SQB Bank documents (`docs/seed-docs/`, Uzbek). No real/private data.
- **Libraries**: NestJS, Prisma, pgvector, BullMQ, `openai`, `pdf-parse`, `mammoth`, React, Vite, Tailwind, shadcn/ui, React Query, Zustand, i18next.

### Responsible AI, fallbacks & limitations
- AI is the **core** value (RAG, scoring, persona), not a superficial chatbot.
- **Grounded only**: KB answers strictly from retrieved docs; if none match it says so (`noAnswerFlag`) and recommends who to ask.
- **Persona honesty**: below `PERSONA_CONFIDENCE_THRESHOLD` (default 0.40) the persona replies "I don't have enough context" instead of fabricating.
- **Structured-output safety**: scoring JSON validated with Zod + 1 retry; UI errors surface as toasts (no silent failures).
- **Cost guard**: per-call token/cost telemetry + daily USD budget kill-switch (`OPENAI_DAILY_BUDGET_USD`).
- **Data**: only synthetic demo data is sent to OpenAI; `OPENAI_API_KEY` read from local `.env` (never committed).
- **Limitations**: ivfflat recall tuned for a small demo corpus; Uzbek TTS/STT quality varies; multi-tenant implemented but the demo ships one tenant (SQB).

---

## Architecture

Monorepo (pnpm workspaces):

```
apps/api          NestJS 10 + TypeScript strict + Prisma + PostgreSQL 16 (pgvector) + Redis (BullMQ)
apps/web          React 18 + Vite + Tailwind + shadcn/ui + React Query + Zustand + i18next
packages/shared   Zod schemas, enums, DTO types (built to dist/)
docs/             design spec, implementation plans, SQB seed documents, pitch
```

- **Multi-tenant** isolation: a Prisma client extension auto-filters reads and auto-injects `tenantId` on writes, driven by `AsyncLocalStorage` populated by `TenantGuard` after JWT auth.
- **Auth**: JWT access (15m) + rotating refresh (30d, sha256-hashed). SSE endpoints authenticate via an httpOnly cookie (EventSource can't set headers).
- **Real-time**: AI responses stream token-by-token over SSE.
- Full design: `docs/superpowers/specs/2026-05-23-corpmind-mvp-design.md`. Contributor conventions: `CLAUDE.md`. Pitch: `docs/PITCH.md`.

## Commands

| Action | Command |
|---|---|
| Bootstrap demo (DB + seed + ingest) | `pnpm demo:bootstrap` |
| Run dev (api + web) | `pnpm dev` |
| Typecheck · lint · test | `pnpm typecheck` · `pnpm lint` · `pnpm test` |
| Reset DB | `pnpm db:reset` |
| Re-ingest SQB docs | `pnpm ingest:demo-docs` |

## Environment variables

Copy `.env.example` to `apps/api/.env`:

```
OPENAI_API_KEY=               # required for AI features (do NOT commit a real key)
OPENAI_MODEL_CHAT=gpt-4o-mini
OPENAI_MODEL_SCORING=gpt-4o
OPENAI_MODEL_EMBED=text-embedding-3-small
OPENAI_MODEL_STT=whisper-1
OPENAI_MODEL_TTS=gpt-4o-mini-tts
OPENAI_TTS_VOICE=alloy
OPENAI_DAILY_BUDGET_USD=15
PERSONA_CONFIDENCE_THRESHOLD=0.40
DATABASE_URL=postgresql://corpmind:corpmind@localhost:5433/corpmind
REDIS_URL=redis://localhost:6380
JWT_ACCESS_SECRET=...         # >= 32 chars
JWT_REFRESH_SECRET=...        # >= 32 chars
```

> Docker maps Postgres to host port **5433** and Redis to **6380** to avoid clashing with other local services.

## Status

Built during the hackathon. All 11 features above are implemented and wired. `pnpm typecheck`, `pnpm test`, and the production web build pass. Core AI flows (hybrid-RAG KB, Aziz persona, simulator gpt-4o scoring, Whisper STT, TTS) are verified end-to-end against a live OpenAI key.
