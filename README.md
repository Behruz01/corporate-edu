# CorpMind — AI-Powered Corporate Learning & Knowledge Platform

> **Build with AI EdTech Hackathon** · Track: **Corporate Education** · Demo client: **SQB Bank** (Uzbekistan)
> Languages: Uzbek (default), Russian, English.

CorpMind is a single AI platform that solves four costly workforce-education problems in one connected loop:

1. **Smart Onboarding** — a structured, role-based day-by-day program with an AI companion that explains company content conversationally and checks comprehension with quizzes.
2. **Knowledge Assistant (RAG)** — instant, document-grounded answers with source citations and a suggested next step. Never answers from general knowledge alone.
3. **Roleplay Simulator** — employees practice real situations (an angry client, a suspicious transaction) against an AI persona, then get a structured 5-dimension score with feedback and a "knowledge bridge" to weak areas.
4. **Employee Knowledge Memory** — captures an employee's notes, decisions and an AI-guided offboarding interview into a queryable, first-person **AI persona** so expertise doesn't walk out the door when they leave.

The learning loop: *Onboarding introduces knowledge → Knowledge Assistant reinforces it → Simulator tests application → Memory preserves it permanently.* The platform is generic (white-label, multi-tenant, industry-configurable); SQB Bank is one configured deployment.

---

## Live demo (local)

```bash
# Prerequisites: Docker, Node >= 20.18, pnpm >= 9, an OpenAI API key
cp .env.example apps/api/.env          # then set OPENAI_API_KEY in apps/api/.env
pnpm install
pnpm demo:bootstrap                    # Postgres+pgvector & Redis up, schema, seed, ingest SQB docs
pnpm dev                               # API → http://localhost:4000  ·  Web → http://localhost:5173
```

Open **http://localhost:5173** and sign in (password for all demo users: **`Demo123!`**):

| Email | Role | What to try |
|---|---|---|
| `bekzod@sqb.uz` | Employee | Onboarding Day 1 + quiz, KB chat (with citations), Simulator (roleplay + score), ask the **Aziz Karimov** persona |
| `malika@sqb.uz` | Manager | Team overview, skill-gap & knowledge-risk reports |
| `nigora@sqb.uz` | HR Admin | Document upload + ingestion status, settings (industry switch), users |

Suggested KB question: *"Yuridik shaxslar uchun kredit foiz stavkalari qanday?"*
Suggested persona question (to Aziz): *"Erta to'lash holatlarini qanday boshqargansiz?"*

> Without `OPENAI_API_KEY`, the app still runs and all seeded data is browsable; only live AI generation (chat, scoring, persona, voice, document embedding) is disabled and degrades gracefully.

---

## AI disclosure

All AI runs through **OpenAI** (single provider), funneled through `apps/api/src/ai/`:

| Capability | Model / approach |
|---|---|
| KB chat, onboarding companion, simulator roleplay, persona answers | `gpt-4o-mini` (streamed via SSE) |
| Simulator scoring, offboarding interview question generation | `gpt-4o` (JSON mode, Zod-validated, 1 retry) |
| Embeddings (document + persona chunks) | `text-embedding-3-small` (1536-dim) |
| Voice input (speech-to-text) | `whisper-1` |
| **Retrieval (RAG)** | **Hybrid**: pgvector cosine similarity **+** PostgreSQL `tsvector` keyword search, fused with **Reciprocal Rank Fusion** (k=60), top-5 chunks |
| **Persona memory** | RAG over each employee's own `PersonaChunk` index + first-person voice system prompt + confidence threshold |

- **Prompts** live in `apps/api/src/ai/prompts/` (KB answer with citation rules, roleplay, scoring rubric, persona voice, offboarding interviewer, language policy).
- **Models are env-configurable** via `OPENAI_MODEL_*` (swap models without code changes).
- **Datasets**: synthetic SQB Bank documents authored for the demo (`docs/seed-docs/`, Uzbek). No real or private data.
- **Libraries**: NestJS, Prisma, pgvector, BullMQ, `openai`, `pdf-parse`, `mammoth`, React, Vite, Tailwind, shadcn/ui, React Query, i18next, recharts-free SVG charts.

### Responsible AI, fallbacks & limitations
- AI is the **core** of the value (RAG, scoring, persona), not a superficial chatbot layer.
- **Grounded only**: the Knowledge Assistant answers strictly from retrieved documents; if none match it says so and recommends who to ask (`noAnswerFlag`).
- **Persona honesty**: if retrieval confidence is below a tunable threshold (`PERSONA_CONFIDENCE_THRESHOLD`, default 0.40), the persona replies "I don't have enough context" instead of fabricating.
- **Structured-output safety**: scoring JSON is validated with Zod and retried once; UI errors surface as toasts, never silent failures.
- **Cost guard**: per-call token/cost telemetry with a daily USD budget kill-switch (`OPENAI_DAILY_BUDGET_USD`).
- **Data**: only synthetic demo data is used; no private/personal data is sent to OpenAI. `OPENAI_API_KEY` is read from a local `.env` (never committed).
- **Limitations**: ivfflat recall is tuned for a small demo corpus; Whisper Uzbek transcription quality varies; multi-tenant is implemented but the demo ships a single tenant (SQB).

---

## Architecture

Monorepo (pnpm workspaces):

```
apps/api      NestJS 10 + TypeScript (strict) + Prisma + PostgreSQL 16 (pgvector) + Redis (BullMQ)
apps/web      React 18 + Vite + Tailwind + shadcn/ui + React Query + Zustand + i18next
packages/shared  Zod schemas, enums, DTO types (built to dist/)
docs/         design spec, implementation plans, SQB seed documents
```

- **Multi-tenant** isolation via a Prisma client extension that auto-filters reads and auto-injects `tenantId` on writes, driven by `AsyncLocalStorage` populated by a `TenantGuard` after JWT auth.
- **Auth**: JWT access (15m) + rotating refresh (30d, hashed). SSE endpoints authenticate via an httpOnly cookie (EventSource can't set headers).
- **Real-time**: AI responses stream token-by-token over SSE.
- See `docs/superpowers/specs/2026-05-23-corpmind-mvp-design.md` for the full design, and `CLAUDE.md` for contributor conventions.

## Commands

| Action | Command |
|---|---|
| Bootstrap demo (DB + seed + ingest) | `pnpm demo:bootstrap` |
| Run dev (api + web) | `pnpm dev` |
| Typecheck / lint / test | `pnpm typecheck` · `pnpm lint` · `pnpm test` |
| Reset DB | `pnpm db:reset` |
| Re-ingest SQB docs | `pnpm ingest:demo-docs` |

## Environment variables

Copy `.env.example` to `apps/api/.env`. Key placeholders:

```
OPENAI_API_KEY=            # required for AI features (do NOT commit a real key)
DATABASE_URL=postgresql://corpmind:corpmind@localhost:5433/corpmind
REDIS_URL=redis://localhost:6380
JWT_ACCESS_SECRET=...      # >= 32 chars
JWT_REFRESH_SECRET=...     # >= 32 chars
OPENAI_DAILY_BUDGET_USD=15
PERSONA_CONFIDENCE_THRESHOLD=0.40
```

> Docker maps Postgres to host port **5433** and Redis to **6380** to avoid clashing with other local services.

## Status

Built during the hackathon. Foundation, KB/RAG, Simulator, Memory, Onboarding, Manager/Admin dashboards, Gamification, Voice input, and Notifications are implemented and wired; `pnpm typecheck`, `pnpm test`, and the production web build pass. Core AI flows (KB RAG, persona, simulator scoring) are verified end-to-end.
