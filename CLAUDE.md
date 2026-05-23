# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

CorpMind — AI-powered corporate learning & knowledge platform (hackathon MVP). Demo client: SQB Bank. Generic B2B SaaS.

## Commands

| Action | Command |
|---|---|
| Start dev (api + web) | `pnpm dev` |
| API only (port 4000) | `pnpm dev:api` |
| Web only (port 5173) | `pnpm dev:web` |
| Bootstrap demo | `pnpm demo:bootstrap` |
| Typecheck | `pnpm typecheck` |
| Lint | `pnpm lint` |
| Tests | `pnpm test` |
| DB up | `pnpm db:up` (Postgres :5433, Redis :6380) |
| Seed | `pnpm db:seed` |
| Reset DB | `pnpm db:reset` |
| Build shared (required after editing packages/shared) | `pnpm --filter @corpmind/shared build` |
| Prisma client | `pnpm --filter @corpmind/api prisma:gen` |

## Architecture (big picture)

- **Monorepo** (pnpm workspaces): `apps/api` (NestJS), `apps/web` (React+Vite), `packages/shared` (zod schemas, enums, DTO types — **compiled to `dist/`**, so run its build after edits).
- **Backend** is NestJS + TypeScript strict + Prisma + PostgreSQL 16 (pgvector) + Redis (BullMQ). Imports use **no `.js` extensions** (tsconfig is CommonJS). The override of the docs (which suggested FastAPI) was intentional.
- **Multi-tenant** is enforced by a Prisma extension (`apps/api/src/prisma/tenant-extension.ts`) that auto-filters reads and auto-injects `tenantId` on writes for tenant-scoped models, using `AsyncLocalStorage` (`apps/api/src/common/request-context.ts`). `TenantGuard` populates the context after `JwtGuard`. Inside a service prefer `prisma.scoped.<model>` for auto-scoping; the unscoped `prisma.<model>` is for seeds, migrations, login, and `/health`.
- **Auth**: JWT access (15m) + rotating refresh (30d, sha256-hashed in `RefreshToken`). SSE endpoints will read the access token from the httpOnly `cm_access` cookie because `EventSource` cannot set headers. Global guards (`JwtGuard`, `TenantGuard`, `RolesGuard`) are registered in `app.module.ts` via `APP_GUARD`; **all three honor `@Public()`**. Use `@Roles(...)` for role gates and `@CurrentUser()` to read the principal.
- **AI** (Plan 2+): all OpenAI calls funnel through `apps/api/src/ai/`. Model selection is env-driven (`OPENAI_MODEL_*`). RAG is hybrid: pgvector cosine + tsvector keyword fused via Reciprocal Rank Fusion. See spec §3.
- **Frontend** uses React Router with three shells (Employee/Manager/Admin), shadcn/ui primitives, React Query (server state), Zustand (UI state), i18next (uz/ru/en). The axios client (`apps/web/src/lib/api/client.ts`) retries a 401 through `/auth/refresh` exactly once.

## Environment & ports

- Postgres runs on host **5433** (not 5432) and Redis on **6380** (not 6379) to avoid colliding with other local Docker projects. `DATABASE_URL`/`REDIS_URL` in `apps/api/.env` reflect this.
- The schema was applied with `prisma db push` + a hand-run SQL block for the pgvector `embedding`/`tsv` columns and ivfflat/gin indexes (Prisma's interactive `migrate dev` doesn't run non-interactively here). When changing the schema, re-run `prisma db push` and re-apply the vector SQL if you touch `DocumentChunk`/`PersonaChunk`.
- **`OPENAI_API_KEY` must be set in `apps/api/.env`** for any AI feature (KB, simulator, persona, onboarding companion). It is optional for the foundation to boot.

## Authoritative documents

- Design spec: `docs/superpowers/specs/2026-05-23-corpmind-mvp-design.md` (single source of truth for data model, prompts, API surface, demo flow).
- Implementation plans: `docs/superpowers/plans/2026-05-23-plan-N-*.md`. Plan 1 (Foundation) is shipped. Plan 2 (Documents + KB) Phase A is fully specified; later phases are expanded just-in-time.

## Conventions

- TS strict everywhere; no `any` without a written reason.
- Nest `Logger` in src (no `console.log`); `console` is fine in seeds/scripts.
- Each NestJS feature: own folder with `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`.
- React feature folders mirror domain (`features/auth`, ...); shared primitives in `components/ui/`, cross-feature widgets in `components/feature/`.
- Demo password for all seed users: `Demo123!` (aziz@, malika@, bekzod@, nigora@, dilshod@ — all `@sqb.uz`).

## Status (plan sequence)

Shipped: Foundation (auth, multi-tenant, shells, i18n, health). Pending: KB/RAG (Plan 2), Onboarding (3), Simulator (4), Memory (5), Dashboard (6), Gamification+voice+demo polish (7).
