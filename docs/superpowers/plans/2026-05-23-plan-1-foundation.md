# CorpMind — Plan 1: Foundation Implementation Plan

> **For agentic workers:** This plan is executed via Codex CLI orchestrated by Claude (the orchestrator). Tasks use checkbox (`- [ ]`) syntax for tracking. Each task is self-contained — file paths, commands, and code are provided in full. Spec reference: `docs/superpowers/specs/2026-05-23-corpmind-mvp-design.md` (cited as §N below).

**Goal:** Build the working skeleton — pnpm monorepo + Docker (Postgres+pgvector, Redis) + full Prisma schema + JWT auth + multi-tenant guards + role gates + React+Vite+Tailwind+shadcn+i18next base shells — so that subsequent module plans can layer features on top without re-litigating infrastructure.

**Architecture:** pnpm workspaces with `apps/api` (NestJS 10 + Prisma 5 + Postgres 16 + pgvector 0.7 + Redis 7 + BullMQ), `apps/web` (React 18 + Vite 5 + Tailwind + shadcn/ui + React Query + Zustand + i18next), `packages/shared` (zod schemas, enums, DTO types). TS strict everywhere. Multi-tenant enforced via JWT claim + AsyncLocalStorage + Prisma extension. SSE wiring is added in this plan but exercised in Plan 2 (KB).

**Tech Stack:** Node 20.18, pnpm 9, TypeScript 5.5 strict, NestJS 10, Prisma 5, Postgres 16 (`pgvector/pgvector:pg16`), Redis 7, React 18, Vite 5, TailwindCSS 3.4, shadcn/ui, @tanstack/react-query 5, Zustand 4, i18next 23 + react-i18next 14, axios 1.

**Definition of Done:**
- `pnpm demo:bootstrap` succeeds end-to-end on a clean checkout
- `pnpm dev` starts api on :4000 and web on :5173
- Login works for all 5 seed users; role-gated routes redirect correctly
- `GET /health` returns `{ status: "ok", postgres: "up", redis: "up" }`
- Lang switcher toggles uz/ru/en; persisted in user profile
- `pnpm typecheck && pnpm lint && pnpm test` all pass
- Foundation Playwright smoke (login → home → lang switch) green

---

## Phase A — Repo & tooling skeleton

### Task A1: pnpm workspace + root scaffolding

**Files:**
- Create: `.nvmrc`
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `.npmrc`
- Create: `.editorconfig`
- Create: `.prettierrc.json`
- Create: `.prettierignore`
- Modify: `.gitignore` (already has base ignores; add a few extras)

- [ ] **Step 1: Verify toolchain**

Run:
```bash
node -v && pnpm -v
```
Expected: `v20.18.x` or higher; pnpm `9.x` or higher. If pnpm missing: `npm i -g pnpm@9`.

- [ ] **Step 2: Write `.nvmrc`**

```
20.18
```

- [ ] **Step 3: Write root `package.json`**

```json
{
  "name": "corpmind",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "engines": {
    "node": ">=20.18.0",
    "pnpm": ">=9.0.0"
  },
  "scripts": {
    "dev": "pnpm -r --parallel run dev",
    "dev:api": "pnpm --filter @corpmind/api dev",
    "dev:web": "pnpm --filter @corpmind/web dev",
    "build": "pnpm -r run build",
    "lint": "pnpm -r run lint",
    "typecheck": "pnpm -r run typecheck",
    "test": "pnpm -r run test",
    "db:up": "docker compose up -d postgres redis",
    "db:down": "docker compose down",
    "db:migrate": "pnpm --filter @corpmind/api prisma migrate dev",
    "db:seed": "pnpm --filter @corpmind/api prisma db seed",
    "db:reset": "pnpm --filter @corpmind/api prisma migrate reset --force",
    "demo:bootstrap": "pnpm db:up && pnpm db:migrate && pnpm db:seed && pnpm ingest:demo-docs",
    "ingest:demo-docs": "pnpm --filter @corpmind/api run ingest:demo",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md,yml,yaml}\""
  },
  "devDependencies": {
    "prettier": "^3.3.3",
    "typescript": "^5.5.4"
  }
}
```

- [ ] **Step 4: Write `pnpm-workspace.yaml`**

```yaml
packages:
  - apps/*
  - packages/*
```

- [ ] **Step 5: Write `.npmrc`**

```
node-linker=isolated
strict-peer-dependencies=false
auto-install-peers=true
shamefully-hoist=false
```

- [ ] **Step 6: Write `.editorconfig`**

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

- [ ] **Step 7: Write `.prettierrc.json`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "arrowParens": "always"
}
```

- [ ] **Step 8: Write `.prettierignore`**

```
pnpm-lock.yaml
dist
build
.next
.superpowers
storage
**/.turbo
**/coverage
**/migrations
```

- [ ] **Step 9: Extend `.gitignore`**

Append (don't overwrite existing):
```
# Tooling
.turbo/
.cache/
coverage/
*.tsbuildinfo

# Editor / OS
.idea/
.vscode/*
!.vscode/extensions.json
!.vscode/settings.json
```

- [ ] **Step 10: Install root deps**

Run:
```bash
pnpm install
```
Expected: lockfile created, no workspaces yet (warnings about empty workspaces are OK).

- [ ] **Step 11: Commit**

```bash
git add .nvmrc package.json pnpm-workspace.yaml .npmrc .editorconfig .prettierrc.json .prettierignore .gitignore pnpm-lock.yaml
git commit -m "chore: scaffold pnpm workspace root"
```

---

### Task A2: Docker Compose for Postgres+pgvector and Redis

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Write `docker-compose.yml`**

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: corpmind-pg
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: corpmind
      POSTGRES_PASSWORD: corpmind
      POSTGRES_DB: corpmind
    volumes:
      - corpmind_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "corpmind", "-d", "corpmind"]
      interval: 5s
      timeout: 5s
      retries: 20

  redis:
    image: redis:7-alpine
    container_name: corpmind-redis
    ports:
      - "6379:6379"
    volumes:
      - corpmind_redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 20

volumes:
  corpmind_pgdata:
  corpmind_redisdata:
```

- [ ] **Step 2: Boot containers and verify**

Run:
```bash
docker compose up -d
docker compose ps
```
Expected: both containers `healthy` within ~15 seconds.

- [ ] **Step 3: Verify pgvector extension installable**

Run:
```bash
docker exec corpmind-pg psql -U corpmind -d corpmind -c "CREATE EXTENSION IF NOT EXISTS vector; SELECT extname, extversion FROM pg_extension WHERE extname='vector';"
```
Expected: a row with `vector` and a version (e.g. `0.7.x`).

- [ ] **Step 4: Verify redis ping**

Run:
```bash
docker exec corpmind-redis redis-cli ping
```
Expected: `PONG`.

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml
git commit -m "chore: add docker-compose with pgvector and redis"
```

---

### Task A3: `packages/shared` skeleton (enums, zod, types)

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/enums.ts`
- Create: `packages/shared/src/schemas/auth.ts`
- Create: `packages/shared/src/schemas/common.ts`
- Create: `packages/shared/src/types/api.ts`
- Create: `packages/shared/src/i18n/keys.ts`

- [ ] **Step 1: `packages/shared/package.json`**

```json
{
  "name": "@corpmind/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./schemas/*": "./src/schemas/*.ts",
    "./i18n/keys": "./src/i18n/keys.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "echo 'no lint'",
    "test": "echo 'no tests'",
    "build": "echo 'no build (source-only package)'",
    "dev": "echo 'no dev'"
  },
  "dependencies": {
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "typescript": "^5.5.4"
  }
}
```

- [ ] **Step 2: `packages/shared/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "verbatimModuleSyntax": true,
    "noEmit": true
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: `packages/shared/src/enums.ts`** (mirrors Prisma enums in spec §2)

```typescript
export const Lang = { UZ: 'UZ', RU: 'RU', EN: 'EN' } as const;
export type Lang = (typeof Lang)[keyof typeof Lang];

export const Role = {
  EMPLOYEE: 'EMPLOYEE',
  MANAGER: 'MANAGER',
  HR_ADMIN: 'HR_ADMIN',
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
  KNOWLEDGE_CURATOR: 'KNOWLEDGE_CURATOR',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  INVITED: 'INVITED',
  DEPARTING: 'DEPARTING',
  INACTIVE: 'INACTIVE',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const OnboardingStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  OVERDUE: 'OVERDUE',
} as const;
export type OnboardingStatus = (typeof OnboardingStatus)[keyof typeof OnboardingStatus];

export const Difficulty = { BASIC: 'BASIC', INTERMEDIATE: 'INTERMEDIATE', ADVANCED: 'ADVANCED' } as const;
export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];

export const DocStatus = {
  PROCESSING: 'PROCESSING',
  READY: 'READY',
  FAILED: 'FAILED',
  OUTDATED: 'OUTDATED',
} as const;
export type DocStatus = (typeof DocStatus)[keyof typeof DocStatus];

export const ConvSource = {
  KB: 'KB',
  ONBOARDING_COMPANION: 'ONBOARDING_COMPANION',
  MEMORY_PERSONA: 'MEMORY_PERSONA',
} as const;
export type ConvSource = (typeof ConvSource)[keyof typeof ConvSource];

export const MsgRole = { USER: 'USER', ASSISTANT: 'ASSISTANT', SYSTEM: 'SYSTEM' } as const;
export type MsgRole = (typeof MsgRole)[keyof typeof MsgRole];

export const NoteVisibility = { PRIVATE: 'PRIVATE', TEAM: 'TEAM', ALL: 'ALL' } as const;
export type NoteVisibility = (typeof NoteVisibility)[keyof typeof NoteVisibility];

export const InterviewStatus = {
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const;
export type InterviewStatus = (typeof InterviewStatus)[keyof typeof InterviewStatus];
```

- [ ] **Step 4: `packages/shared/src/schemas/common.ts`**

```typescript
import { z } from 'zod';

export const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof PaginationQuery>;

export const Paginated = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    data: z.array(item),
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
  });

export const ProblemDetails = z.object({
  statusCode: z.number().int(),
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
  requestId: z.string().optional(),
});
export type ProblemDetails = z.infer<typeof ProblemDetails>;
```

- [ ] **Step 5: `packages/shared/src/schemas/auth.ts`**

```typescript
import { z } from 'zod';
import { Lang, Role, UserStatus } from '../enums.js';

export const LoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});
export type LoginInput = z.infer<typeof LoginInput>;

export const AuthUser = z.object({
  id: z.string(),
  tenantId: z.string(),
  email: z.string().email(),
  fullName: z.string(),
  role: z.enum([Role.EMPLOYEE, Role.MANAGER, Role.HR_ADMIN, Role.PLATFORM_ADMIN, Role.KNOWLEDGE_CURATOR]),
  status: z.enum([UserStatus.ACTIVE, UserStatus.INVITED, UserStatus.DEPARTING, UserStatus.INACTIVE]),
  preferredLang: z.enum([Lang.UZ, Lang.RU, Lang.EN]),
  pointsTotal: z.number().int(),
});
export type AuthUser = z.infer<typeof AuthUser>;

export const LoginResponse = z.object({
  user: AuthUser,
  accessToken: z.string(),
});
export type LoginResponse = z.infer<typeof LoginResponse>;

export const RefreshResponse = z.object({
  accessToken: z.string(),
});
export type RefreshResponse = z.infer<typeof RefreshResponse>;

export const UpdateLangInput = z.object({
  lang: z.enum([Lang.UZ, Lang.RU, Lang.EN]),
});
export type UpdateLangInput = z.infer<typeof UpdateLangInput>;
```

- [ ] **Step 6: `packages/shared/src/types/api.ts`**

```typescript
export type ApiSuccess<T> = T;

export type Branding = {
  logoUrl?: string;
  colors?: { primary?: string; accent?: string };
  platformName?: string;
};

export type TenantSummary = {
  id: string;
  name: string;
  slug: string;
  industry: string;
  primaryLang: 'UZ' | 'RU' | 'EN';
  langs: Array<'UZ' | 'RU' | 'EN'>;
  branding: Branding | null;
};
```

- [ ] **Step 7: `packages/shared/src/i18n/keys.ts`** (just the namespaces; full strings live in web app)

```typescript
export const I18N_NAMESPACES = ['common', 'auth', 'onboarding', 'kb', 'simulator', 'memory', 'dashboard', 'admin'] as const;
export type I18nNamespace = (typeof I18N_NAMESPACES)[number];

export const SUPPORTED_LANGS = ['uz', 'ru', 'en'] as const;
export type UiLang = (typeof SUPPORTED_LANGS)[number];
export const DEFAULT_LANG: UiLang = 'uz';
```

- [ ] **Step 8: `packages/shared/src/index.ts`**

```typescript
export * from './enums.js';
export * from './schemas/auth.js';
export * from './schemas/common.js';
export * from './types/api.js';
export * from './i18n/keys.js';
```

- [ ] **Step 9: Install + typecheck**

Run:
```bash
pnpm install
pnpm --filter @corpmind/shared typecheck
```
Expected: install succeeds; typecheck passes with no errors.

- [ ] **Step 10: Commit**

```bash
git add packages/ pnpm-lock.yaml
git commit -m "feat(shared): add enums, zod schemas, api types, i18n keys"
```

---

## Phase B — Backend (NestJS) skeleton

### Task B1: NestJS app scaffold

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/tsconfig.build.json`
- Create: `apps/api/nest-cli.json`
- Create: `apps/api/.eslintrc.cjs`
- Create: `apps/api/jest.config.ts`
- Create: `apps/api/test/jest-e2e.json`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/app.controller.ts`
- Create: `apps/api/src/app.controller.spec.ts`

- [ ] **Step 1: `apps/api/package.json`**

```json
{
  "name": "@corpmind/api",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main",
    "lint": "eslint \"src/**/*.ts\" \"test/**/*.ts\"",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:e2e": "jest --config test/jest-e2e.json",
    "prisma:gen": "prisma generate",
    "ingest:demo": "tsx src/scripts/ingest-demo-docs.ts"
  },
  "dependencies": {
    "@corpmind/shared": "workspace:*",
    "@nestjs/common": "^10.4.4",
    "@nestjs/config": "^3.2.3",
    "@nestjs/core": "^10.4.4",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/passport": "^10.0.3",
    "@nestjs/platform-express": "^10.4.4",
    "@nestjs/swagger": "^7.4.2",
    "@nestjs/throttler": "^6.2.1",
    "@prisma/client": "^5.20.0",
    "argon2": "^0.41.1",
    "bullmq": "^5.21.2",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "compression": "^1.7.4",
    "cookie-parser": "^1.4.7",
    "helmet": "^7.2.0",
    "ioredis": "^5.4.1",
    "nestjs-pino": "^4.1.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "pino": "^9.5.0",
    "pino-http": "^10.3.0",
    "pino-pretty": "^11.3.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "uuid": "^10.0.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.5",
    "@nestjs/schematics": "^10.2.3",
    "@nestjs/testing": "^10.4.4",
    "@types/compression": "^1.7.5",
    "@types/cookie-parser": "^1.4.7",
    "@types/express": "^5.0.0",
    "@types/jest": "^29.5.13",
    "@types/node": "^20.16.10",
    "@types/passport-jwt": "^4.0.1",
    "@types/supertest": "^6.0.2",
    "@types/uuid": "^10.0.0",
    "@typescript-eslint/eslint-plugin": "^8.8.1",
    "@typescript-eslint/parser": "^8.8.1",
    "eslint": "^8.57.1",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-prettier": "^5.2.1",
    "jest": "^29.7.0",
    "prisma": "^5.20.0",
    "supertest": "^7.0.0",
    "testcontainers": "^10.13.2",
    "ts-jest": "^29.2.5",
    "ts-node": "^10.9.2",
    "tsx": "^4.19.1",
    "typescript": "^5.5.4"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

- [ ] **Step 2: `apps/api/tsconfig.json`**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2022",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "baseUrl": "./",
    "paths": { "@/*": ["src/*"] },
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "declaration": true,
    "sourceMap": true,
    "removeComments": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "incremental": true
  },
  "include": ["src/**/*.ts", "test/**/*.ts", "prisma/seed.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: `apps/api/tsconfig.build.json`**

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*.spec.ts"]
}
```

- [ ] **Step 4: `apps/api/nest-cli.json`**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "tsConfigPath": "tsconfig.build.json"
  }
}
```

- [ ] **Step 5: `apps/api/.eslintrc.cjs`**

```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: { project: 'tsconfig.json', tsconfigRootDir: __dirname, sourceType: 'module' },
  plugins: ['@typescript-eslint', 'prettier'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  root: true,
  env: { node: true, jest: true },
  ignorePatterns: ['.eslintrc.cjs', 'dist', 'node_modules'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
  },
};
```

- [ ] **Step 6: `apps/api/jest.config.ts`**

```typescript
import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
};
export default config;
```

- [ ] **Step 7: `apps/api/test/jest-e2e.json`**

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "moduleNameMapper": { "^@/(.*)$": "<rootDir>/../src/$1" }
}
```

- [ ] **Step 8: `apps/api/src/main.ts` (minimal — will grow in later tasks)**

```typescript
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api/v1');
  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
  Logger.log(`CorpMind API listening on http://localhost:${port}/api/v1`, 'Bootstrap');
}
void bootstrap();
```

- [ ] **Step 9: `apps/api/src/app.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
```

- [ ] **Step 10: `apps/api/src/app.controller.ts`**

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('ping')
  ping(): { ok: true } {
    return { ok: true };
  }
}
```

- [ ] **Step 11: `apps/api/src/app.controller.spec.ts`**

```typescript
import { Test } from '@nestjs/testing';
import { AppController } from './app.controller.js';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({ controllers: [AppController] }).compile();
    controller = module.get(AppController);
  });

  it('GET /ping → { ok: true }', () => {
    expect(controller.ping()).toEqual({ ok: true });
  });
});
```

- [ ] **Step 12: Install & verify**

Run:
```bash
pnpm install
pnpm --filter @corpmind/api typecheck
pnpm --filter @corpmind/api test
```
Expected: typecheck passes, 1 test passes.

- [ ] **Step 13: Smoke-run dev server**

Run (in another terminal):
```bash
pnpm --filter @corpmind/api dev
```
Expected: `CorpMind API listening on http://localhost:4000/api/v1`. Then in this terminal:
```bash
curl http://localhost:4000/api/v1/ping
```
Expected: `{"ok":true}`. Kill the dev server (Ctrl-C).

- [ ] **Step 14: Commit**

```bash
git add apps/api/ pnpm-lock.yaml
git commit -m "feat(api): scaffold NestJS app with ping endpoint and base config"
```

---

### Task B2: Env validation (zod) + ConfigModule

**Files:**
- Create: `.env.example` (root, copy spec §5.4)
- Create: `apps/api/.env` (copy of `.env.example` with localhost defaults; .gitignored)
- Create: `apps/api/src/config/env.ts`
- Create: `apps/api/src/config/config.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/main.ts`
- Create: `apps/api/src/config/env.spec.ts`

- [ ] **Step 1: Root `.env.example`** (verbatim from spec §5.4 — paste it fully)

```env
# API
NODE_ENV=development
API_PORT=4000
API_BASE_URL=http://localhost:4000
WEB_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://corpmind:corpmind@localhost:5432/corpmind
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=change-me-please-32chars-min-aaaaaa
JWT_REFRESH_SECRET=change-me-please-too-32chars-bbbbb
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
PERSONA_CONFIDENCE_THRESHOLD=0.55

# OpenAI
OPENAI_API_KEY=
OPENAI_MODEL_CHAT=gpt-4o-mini
OPENAI_MODEL_SCORING=gpt-4o
OPENAI_MODEL_EMBED=text-embedding-3-small
OPENAI_MODEL_STT=whisper-1
OPENAI_DAILY_BUDGET_USD=15

# Storage
STORAGE_DRIVER=local
STORAGE_LOCAL_DIR=./storage
STORAGE_PUBLIC_URL=http://localhost:4000/files

# Demo tenant
DEMO_TENANT_SLUG=sqb
DEMO_TENANT_NAME=SQB Bank

# Web
VITE_API_BASE_URL=http://localhost:4000
VITE_DEFAULT_LANG=uz
```

- [ ] **Step 2: `apps/api/.env`**

Copy from root `.env.example`, then set `OPENAI_API_KEY=` to the value you've been given (or leave blank — Plan 2 needs it).

- [ ] **Step 3: `apps/api/src/config/env.ts`**

```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  API_BASE_URL: z.string().url(),
  WEB_ORIGIN: z.string().url(),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  PERSONA_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.55),

  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL_CHAT: z.string().default('gpt-4o-mini'),
  OPENAI_MODEL_SCORING: z.string().default('gpt-4o'),
  OPENAI_MODEL_EMBED: z.string().default('text-embedding-3-small'),
  OPENAI_MODEL_STT: z.string().default('whisper-1'),
  OPENAI_DAILY_BUDGET_USD: z.coerce.number().min(0).default(15),

  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('./storage'),
  STORAGE_PUBLIC_URL: z.string().url(),

  DEMO_TENANT_SLUG: z.string().default('sqb'),
  DEMO_TENANT_NAME: z.string().default('SQB Bank'),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function loadEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export function resetEnvCacheForTests(): void {
  cached = undefined;
}
```

- [ ] **Step 4: `apps/api/src/config/config.module.ts`**

```typescript
import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { loadEnv } from './env.js';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [() => loadEnv()],
      ignoreEnvFile: false,
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModule {}
```

- [ ] **Step 5: `apps/api/src/config/env.spec.ts`**

```typescript
import { loadEnv, resetEnvCacheForTests } from './env.js';

describe('loadEnv', () => {
  beforeEach(() => resetEnvCacheForTests());

  it('throws when required vars are missing', () => {
    expect(() => loadEnv({} as NodeJS.ProcessEnv)).toThrow(/Invalid environment configuration/);
  });

  it('returns parsed env when valid', () => {
    const env = loadEnv({
      NODE_ENV: 'test',
      API_PORT: '4000',
      API_BASE_URL: 'http://localhost:4000',
      WEB_ORIGIN: 'http://localhost:5173',
      DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
      REDIS_URL: 'redis://localhost:6379',
      JWT_ACCESS_SECRET: 'x'.repeat(32),
      JWT_REFRESH_SECRET: 'y'.repeat(32),
      STORAGE_PUBLIC_URL: 'http://localhost:4000/files',
    } as NodeJS.ProcessEnv);
    expect(env.API_PORT).toBe(4000);
    expect(env.STORAGE_DRIVER).toBe('local');
  });
});
```

- [ ] **Step 6: Update `apps/api/src/app.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import { AppController } from './app.controller.js';

@Module({
  imports: [ConfigModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
```

- [ ] **Step 7: Update `apps/api/src/main.ts`** (call loadEnv before bootstrap so failures are early)

```typescript
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { loadEnv } from './config/env.js';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api/v1');
  await app.listen(env.API_PORT);
  Logger.log(`CorpMind API listening on http://localhost:${env.API_PORT}/api/v1`, 'Bootstrap');
}
void bootstrap();
```

- [ ] **Step 8: Run tests**

Run:
```bash
pnpm --filter @corpmind/api test
```
Expected: 3 tests pass (AppController.ping + 2 env tests).

- [ ] **Step 9: Commit**

```bash
git add .env.example apps/api/src/config/ apps/api/src/app.module.ts apps/api/src/main.ts
git commit -m "feat(api): add env validation with zod + ConfigModule"
```

---

### Task B3: Prisma init + full schema (verbatim from spec §2)

**Files:**
- Create: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Initialize Prisma directory**

Run:
```bash
cd apps/api
pnpm exec prisma init --datasource-provider postgresql
cd ../..
```
This creates `apps/api/prisma/schema.prisma` and `apps/api/.env` (Prisma may overwrite — restore your `.env` from Task B2).

- [ ] **Step 2: Write `apps/api/prisma/schema.prisma`** (complete schema; mirrors spec §2 exactly)

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgvector(map: "vector", schema: "public"), pg_trgm]
}

// =====================  Enums  =====================

enum Lang        { UZ RU EN }
enum Role        { EMPLOYEE MANAGER HR_ADMIN PLATFORM_ADMIN KNOWLEDGE_CURATOR }
enum UserStatus  { ACTIVE INVITED DEPARTING INACTIVE }
enum OnboardingStatus { IN_PROGRESS COMPLETED OVERDUE }
enum QuizType    { MCQ TRUE_FALSE SHORT_ANSWER }
enum DocStatus   { PROCESSING READY FAILED OUTDATED }
enum ConvSource  { KB ONBOARDING_COMPANION MEMORY_PERSONA }
enum MsgRole     { USER ASSISTANT SYSTEM }
enum SuggestionKind { KB_READ SIMULATOR ONBOARDING PERSONA_ASK }
enum Difficulty  { BASIC INTERMEDIATE ADVANCED }
enum SessionStatus { IN_PROGRESS COMPLETED ABANDONED }
enum Speaker     { EMPLOYEE AI_PERSONA }
enum NoteKind    { PROJECT_REFLECTION DECISION PROCESS LESSON }
enum NoteVisibility { PRIVATE TEAM ALL }
enum PersonaSource { NOTE OFFBOARDING_ANSWER KB_ANSWER SIM_TRANSCRIPT }
enum InterviewStatus { SCHEDULED IN_PROGRESS COMPLETED }

// =====================  Foundation  =====================

model Tenant {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  industry    String
  primaryLang Lang     @default(UZ)
  langs       Lang[]   @default([UZ, RU, EN])
  branding    Json?
  createdAt   DateTime @default(now())

  users                User[]
  documents            Document[]
  conversations        Conversation[]
  scenarios            Scenario[]
  simulatorSessions    SimulatorSession[]
  onboardingTemplates  OnboardingTemplate[]
  onboardingAssignments OnboardingAssignment[]
  projects             Project[]
  knowledgeNotes       KnowledgeNote[]
  personas             Persona[]
  personaChunks        PersonaChunk[]
  offboardingInterviews OffboardingInterview[]
  pointsEvents         PointsEvent[]
  badges               Badge[]
  notifications        Notification[]
  analyticsEvents      AnalyticsEvent[]
  documentChunks       DocumentChunk[]
}

model User {
  id            String     @id @default(cuid())
  tenantId      String
  email         String
  passwordHash  String
  fullName      String
  role          Role       @default(EMPLOYEE)
  department    String?
  position      String?
  managerId     String?
  status        UserStatus @default(ACTIVE)
  startedAt     DateTime?
  departingAt   DateTime?
  preferredLang Lang       @default(UZ)
  pointsTotal   Int        @default(0)
  createdAt     DateTime   @default(now())

  tenant  Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  manager User?  @relation("UserManager", fields: [managerId], references: [id], onDelete: SetNull)
  reports User[] @relation("UserManager")

  refreshTokens         RefreshToken[]
  onboardingAssignments OnboardingAssignment[]
  conversations         Conversation[]
  documentsUploaded     Document[]
  simulatorSessions     SimulatorSession[]
  knowledgeNotes        KnowledgeNote[]
  persona               Persona?
  offboardingInterviews OffboardingInterview[]
  pointsEvents          PointsEvent[]
  badges                Badge[]
  notifications         Notification[]
  projectMemberships    ProjectMember[]
  analyticsEvents       AnalyticsEvent[]

  @@unique([tenantId, email])
  @@index([tenantId])
  @@index([managerId])
}

model RefreshToken {
  id          String    @id @default(cuid())
  userId      String
  hashedToken String    @unique
  expiresAt   DateTime
  revokedAt   DateTime?
  createdAt   DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

// =====================  Onboarding  =====================

model OnboardingTemplate {
  id        String          @id @default(cuid())
  tenantId  String
  role      String
  name      String
  isActive  Boolean         @default(true)
  createdAt DateTime        @default(now())

  tenant      Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  days        OnboardingDay[]
  assignments OnboardingAssignment[]

  @@index([tenantId])
}

model OnboardingDay {
  id           String  @id @default(cuid())
  templateId   String
  dayNumber    Int
  title        String
  description  String
  estimatedMin Int

  template OnboardingTemplate     @relation(fields: [templateId], references: [id], onDelete: Cascade)
  topics   OnboardingTopic[]
  quiz     Quiz?
  progress OnboardingDayProgress[]

  @@index([templateId])
}

model OnboardingTopic {
  id          String   @id @default(cuid())
  dayId       String
  order       Int
  title       String
  content     String
  documentIds String[]

  day OnboardingDay @relation(fields: [dayId], references: [id], onDelete: Cascade)

  @@index([dayId])
}

model OnboardingAssignment {
  id          String           @id @default(cuid())
  tenantId    String
  userId      String
  templateId  String
  startedAt   DateTime
  currentDay  Int              @default(1)
  status      OnboardingStatus @default(IN_PROGRESS)
  createdAt   DateTime         @default(now())

  tenant      Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user        User                    @relation(fields: [userId], references: [id], onDelete: Cascade)
  template    OnboardingTemplate      @relation(fields: [templateId], references: [id], onDelete: Cascade)
  dayProgress OnboardingDayProgress[]

  @@index([tenantId])
  @@index([userId])
}

model OnboardingDayProgress {
  id           String    @id @default(cuid())
  assignmentId String
  dayId        String
  startedAt    DateTime?
  completedAt  DateTime?
  quizScore    Int?
  timeSpentSec Int       @default(0)

  assignment OnboardingAssignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  day        OnboardingDay        @relation(fields: [dayId], references: [id], onDelete: Cascade)

  @@unique([assignmentId, dayId])
}

model Quiz {
  id    String         @id @default(cuid())
  dayId String         @unique
  day   OnboardingDay  @relation(fields: [dayId], references: [id], onDelete: Cascade)
  questions QuizQuestion[]
}

model QuizQuestion {
  id          String   @id @default(cuid())
  quizId      String
  type        QuizType
  prompt      String
  options     Json?
  correct     Json
  explanation String?

  quiz Quiz @relation(fields: [quizId], references: [id], onDelete: Cascade)
}

// =====================  KB + RAG  =====================

model Document {
  id           String     @id @default(cuid())
  tenantId     String
  title        String
  filename     String
  mimeType     String
  storageKey   String
  lang         Lang
  version      Int        @default(1)
  status       DocStatus  @default(PROCESSING)
  category     String?
  visibility   String[]
  uploadedById String
  chunkCount   Int        @default(0)
  pages        Int?
  createdAt    DateTime   @default(now())

  tenant       Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  uploadedBy   User            @relation(fields: [uploadedById], references: [id])
  chunks       DocumentChunk[]
  citations    Citation[]

  @@index([tenantId])
}

model DocumentChunk {
  id         String   @id @default(cuid())
  tenantId   String
  documentId String
  chunkIndex Int
  text       String
  page       Int?
  section    String?
  tokenCount Int
  // embedding vector(1536) and tsv tsvector are added via raw SQL in the migration
  createdAt  DateTime @default(now())

  tenant   Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  document Document   @relation(fields: [documentId], references: [id], onDelete: Cascade)
  citations Citation[]

  @@index([tenantId])
  @@index([documentId])
}

model Conversation {
  id         String     @id @default(cuid())
  tenantId   String
  userId     String
  source     ConvSource
  contextRef String?
  title      String?
  createdAt  DateTime   @default(now())

  tenant   Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages Message[]

  @@index([tenantId, userId])
}

model Message {
  id             String   @id @default(cuid())
  conversationId String
  role           MsgRole
  content        String
  lang           Lang?
  rating         Int?
  noAnswerFlag   Boolean  @default(false)
  createdAt      DateTime @default(now())

  conversation Conversation        @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  citations    Citation[]
  nextStep     NextStepSuggestion?

  @@index([conversationId])
}

model Citation {
  id         String  @id @default(cuid())
  messageId  String
  documentId String
  chunkId    String
  page       Int?
  section    String?
  snippet    String
  score      Float

  message  Message       @relation(fields: [messageId], references: [id], onDelete: Cascade)
  document Document      @relation(fields: [documentId], references: [id])
  chunk    DocumentChunk @relation(fields: [chunkId], references: [id])

  @@index([messageId])
}

model NextStepSuggestion {
  id        String         @id @default(cuid())
  messageId String         @unique
  kind      SuggestionKind
  refId     String
  label     String

  message Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
}

// =====================  Simulator  =====================

model Scenario {
  id          String     @id @default(cuid())
  tenantId    String
  category    String
  title       String
  brief       String
  personaDesc String
  difficulty  Difficulty
  lang        Lang
  active      Boolean    @default(true)
  createdAt   DateTime   @default(now())

  tenant   Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  criteria ScenarioCriterion[]
  sessions SimulatorSession[]

  @@index([tenantId])
}

model ScenarioCriterion {
  id         String  @id @default(cuid())
  scenarioId String
  dimension  String
  weight     Float   @default(1.0)
  rubric     String

  scenario Scenario @relation(fields: [scenarioId], references: [id], onDelete: Cascade)

  @@index([scenarioId])
}

model SimulatorSession {
  id         String        @id @default(cuid())
  tenantId   String
  userId     String
  scenarioId String
  attemptNum Int           @default(1)
  status     SessionStatus
  startedAt  DateTime      @default(now())
  endedAt    DateTime?

  tenant   Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user     User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  scenario Scenario        @relation(fields: [scenarioId], references: [id])
  turns    SimulatorTurn[]
  score    SimulatorScore?

  @@index([tenantId, userId])
}

model SimulatorTurn {
  id        String   @id @default(cuid())
  sessionId String
  turnIndex Int
  speaker   Speaker
  text      String
  createdAt DateTime @default(now())

  session SimulatorSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
}

model SimulatorScore {
  id              String   @id @default(cuid())
  sessionId       String   @unique
  overall         Int
  dimensionScores Json
  feedback        Json
  weakAreas       Json
  createdAt       DateTime @default(now())

  session SimulatorSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
}

// =====================  Memory  =====================

model Project {
  id          String   @id @default(cuid())
  tenantId    String
  name        String
  department  String?
  description String?
  status      String   @default("active")
  createdAt   DateTime @default(now())

  tenant  Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  members ProjectMember[]
  notes   KnowledgeNote[]

  @@index([tenantId])
}

model ProjectMember {
  id        String @id @default(cuid())
  projectId String
  userId    String
  role      String

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([projectId, userId])
}

model KnowledgeNote {
  id         String         @id @default(cuid())
  tenantId   String
  authorId   String
  projectId  String?
  kind       NoteKind
  prompt     String?
  text       String
  visibility NoteVisibility @default(PRIVATE)
  tags       String[]       @default([])
  createdAt  DateTime       @default(now())

  tenant  Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  author  User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  project Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)

  @@index([tenantId, authorId])
}

model Persona {
  id             String    @id @default(cuid())
  tenantId       String
  userId         String    @unique
  voiceProfile   String
  expertiseTags  String[]  @default([])
  expertiseScore Json      @default("{}")
  lastTrainedAt  DateTime?
  createdAt      DateTime  @default(now())

  tenant Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user   User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  chunks PersonaChunk[]

  @@index([tenantId])
}

model PersonaChunk {
  id          String        @id @default(cuid())
  tenantId    String
  personaId   String
  source      PersonaSource
  sourceRefId String
  text        String
  tokenCount  Int
  // embedding vector(1536) added via raw SQL in migration
  createdAt   DateTime      @default(now())

  tenant  Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  persona Persona @relation(fields: [personaId], references: [id], onDelete: Cascade)

  @@index([personaId])
  @@index([tenantId])
}

model OffboardingInterview {
  id          String          @id @default(cuid())
  tenantId    String
  userId      String
  triggeredBy String
  status      InterviewStatus @default(SCHEDULED)
  startedAt   DateTime?
  completedAt DateTime?

  tenant    Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user      User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  questions OffboardingQA[]

  @@index([tenantId, userId])
}

model OffboardingQA {
  id             String  @id @default(cuid())
  interviewId    String
  order          Int
  questionText   String
  questionKind   String
  answerText     String?
  answerAudioKey String?
  durationSec    Int?

  interview OffboardingInterview @relation(fields: [interviewId], references: [id], onDelete: Cascade)

  @@index([interviewId])
}

// =====================  Supporting  =====================

model PointsEvent {
  id        String   @id @default(cuid())
  tenantId  String
  userId    String
  reason    String
  points    Int
  metadata  Json?
  createdAt DateTime @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([tenantId, userId])
}

model Badge {
  id        String   @id @default(cuid())
  tenantId  String
  userId    String
  code      String
  awardedAt DateTime @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, code])
}

model Notification {
  id        String    @id @default(cuid())
  tenantId  String
  userId    String
  kind      String
  title     String
  body      String
  link      String?
  readAt    DateTime?
  createdAt DateTime  @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([tenantId, userId, readAt])
}

model AnalyticsEvent {
  id        String   @id @default(cuid())
  tenantId  String
  userId    String?
  event     String
  payload   Json
  createdAt DateTime @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user   User?  @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([tenantId, event, createdAt])
}
```

- [ ] **Step 3: Format and validate**

Run:
```bash
pnpm --filter @corpmind/api exec prisma format
pnpm --filter @corpmind/api exec prisma validate
```
Expected: no errors.

- [ ] **Step 4: Commit (no migration yet — that's the next task)**

```bash
git add apps/api/prisma/schema.prisma
git commit -m "feat(api): add full Prisma schema for all modules"
```

---

### Task B4: First migration + pgvector raw SQL

**Files:**
- Create: `apps/api/prisma/migrations/<timestamp>_init/migration.sql` (Prisma generates the initial migration; you append pgvector SQL by hand)

- [ ] **Step 1: Ensure docker services are up**

Run:
```bash
docker compose up -d postgres redis
```
Expected: containers healthy.

- [ ] **Step 2: Create initial migration (do not apply yet)**

Run:
```bash
pnpm --filter @corpmind/api exec prisma migrate dev --name init --create-only
```
Expected: a new folder `apps/api/prisma/migrations/<timestamp>_init/` with `migration.sql`.

- [ ] **Step 3: Append pgvector raw SQL to the generated `migration.sql`**

Open `apps/api/prisma/migrations/<timestamp>_init/migration.sql` and append at the bottom (verbatim from spec §2.7):

```sql
-- pgvector and pg_trgm extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- DocumentChunk: embedding + tsv
ALTER TABLE "DocumentChunk"
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS tsv tsvector
    GENERATED ALWAYS AS (to_tsvector('simple', coalesce(text,''))) STORED;

CREATE INDEX IF NOT EXISTS dc_embedding_ivfflat
  ON "DocumentChunk" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS dc_tsv_gin ON "DocumentChunk" USING gin (tsv);
CREATE INDEX IF NOT EXISTS dc_tenant_doc ON "DocumentChunk" ("tenantId", "documentId");

-- PersonaChunk: embedding
ALTER TABLE "PersonaChunk"
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

CREATE INDEX IF NOT EXISTS pc_embedding_ivfflat
  ON "PersonaChunk" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS pc_tenant_persona ON "PersonaChunk" ("tenantId", "personaId");
```

- [ ] **Step 4: Apply the migration**

Run:
```bash
pnpm --filter @corpmind/api exec prisma migrate dev
```
Expected: applies the init migration; Prisma client regenerated.

- [ ] **Step 5: Verify extensions and indexes exist**

Run:
```bash
docker exec corpmind-pg psql -U corpmind -d corpmind -c \
  "SELECT extname FROM pg_extension WHERE extname IN ('vector','pg_trgm') ORDER BY 1;"
docker exec corpmind-pg psql -U corpmind -d corpmind -c \
  "SELECT indexname FROM pg_indexes WHERE indexname IN ('dc_embedding_ivfflat','dc_tsv_gin','pc_embedding_ivfflat') ORDER BY 1;"
```
Expected: 2 extensions and 3 indexes listed.

- [ ] **Step 6: Commit**

```bash
git add apps/api/prisma/migrations/
git commit -m "feat(db): initial migration with pgvector + tsvector indexes"
```

---

### Task B5: PrismaService + tenant-scoped Prisma extension

**Files:**
- Create: `apps/api/src/prisma/prisma.service.ts`
- Create: `apps/api/src/prisma/prisma.module.ts`
- Create: `apps/api/src/common/request-context.ts`
- Create: `apps/api/src/prisma/tenant-extension.ts`
- Create: `apps/api/src/prisma/prisma.service.spec.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: `apps/api/src/common/request-context.ts`** — AsyncLocalStorage carrier

```typescript
import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestCtx = {
  requestId: string;
  tenantId?: string;
  userId?: string;
};

export const requestContext = new AsyncLocalStorage<RequestCtx>();

export function getRequestCtx(): RequestCtx | undefined {
  return requestContext.getStore();
}

export function getTenantIdOrThrow(): string {
  const ctx = requestContext.getStore();
  if (!ctx?.tenantId) {
    throw new Error('Tenant context missing — TenantGuard must run before tenant-scoped queries');
  }
  return ctx.tenantId;
}
```

- [ ] **Step 2: `apps/api/src/prisma/tenant-extension.ts`** — auto-filter + auto-assign tenantId

```typescript
import { Prisma } from '@prisma/client';
import { getRequestCtx } from '../common/request-context.js';

const TENANT_SCOPED_MODELS = new Set([
  'User',
  'Document',
  'DocumentChunk',
  'Conversation',
  'Message',
  'OnboardingTemplate',
  'OnboardingAssignment',
  'Scenario',
  'SimulatorSession',
  'Project',
  'KnowledgeNote',
  'Persona',
  'PersonaChunk',
  'OffboardingInterview',
  'PointsEvent',
  'Badge',
  'Notification',
  'AnalyticsEvent',
]);

const READ_OPS = new Set(['findFirst', 'findMany', 'findUnique', 'count', 'aggregate', 'groupBy']);
const WRITE_OPS = new Set(['create', 'createMany', 'upsert']);

export const tenantExtension = Prisma.defineExtension({
  name: 'tenant-scope',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!model || !TENANT_SCOPED_MODELS.has(model)) {
          return query(args);
        }
        const ctx = getRequestCtx();
        const tenantId = ctx?.tenantId;

        if (!tenantId) {
          // Allow operations explicitly opted out via $allowCrossTenant marker
          if ((args as Record<string, unknown>)?.['$allowCrossTenant']) {
            const { $allowCrossTenant: _drop, ...rest } = args as Record<string, unknown>;
            return query(rest as typeof args);
          }
          throw new Error(
            `Tenant context required for ${model}.${operation}. Run inside TenantGuard or pass $allowCrossTenant.`,
          );
        }

        if (READ_OPS.has(operation)) {
          const a = (args ?? {}) as Record<string, unknown>;
          const existingWhere = (a['where'] ?? {}) as Record<string, unknown>;
          a['where'] = { ...existingWhere, tenantId };
          return query(a as typeof args);
        }

        if (WRITE_OPS.has(operation)) {
          const a = (args ?? {}) as Record<string, unknown>;
          if (operation === 'createMany') {
            const data = a['data'] as Record<string, unknown> | Array<Record<string, unknown>>;
            a['data'] = Array.isArray(data)
              ? data.map((d) => ({ tenantId, ...d }))
              : { tenantId, ...data };
          } else {
            const data = (a['data'] ?? {}) as Record<string, unknown>;
            a['data'] = { tenantId, ...data };
            if (operation === 'upsert') {
              const w = (a['where'] ?? {}) as Record<string, unknown>;
              a['where'] = { ...w, tenantId };
            }
          }
          return query(a as typeof args);
        }

        // update / delete / etc — inject tenantId into where
        const a = (args ?? {}) as Record<string, unknown>;
        const existingWhere = (a['where'] ?? {}) as Record<string, unknown>;
        a['where'] = { ...existingWhere, tenantId };
        return query(a as typeof args);
      },
    },
  },
});
```

- [ ] **Step 3: `apps/api/src/prisma/prisma.service.ts`**

```typescript
import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { tenantExtension } from './tenant-extension.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  readonly scoped: ReturnType<PrismaClient['$extends']>;

  constructor() {
    super({ log: ['warn', 'error'] });
    this.scoped = this.$extends(tenantExtension);
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
```

> Usage convention: tenant-scoped controllers use `prisma.scoped.<model>`; raw-SQL or seed scripts use the base `prisma.<model>`.

- [ ] **Step 4: `apps/api/src/prisma/prisma.module.ts`**

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 5: `apps/api/src/prisma/prisma.service.spec.ts`** — sanity check on the extension

```typescript
import { requestContext } from '../common/request-context.js';

describe('tenant extension wiring (sanity)', () => {
  it('runs inside AsyncLocalStorage with tenantId', () => {
    requestContext.run({ requestId: 'r1', tenantId: 't1' }, () => {
      expect(requestContext.getStore()?.tenantId).toBe('t1');
    });
  });
});
```

- [ ] **Step 6: Update `apps/api/src/app.module.ts`** — register PrismaModule

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AppController } from './app.controller.js';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
```

- [ ] **Step 7: Run tests**

Run:
```bash
pnpm --filter @corpmind/api test
```
Expected: all green (includes the new wiring test).

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/prisma/ apps/api/src/common/request-context.ts apps/api/src/app.module.ts
git commit -m "feat(api): add PrismaService with tenant-scoped extension and ALS context"
```

---

### Task B6: Common module — filters, interceptors, decorators, request id

**Files:**
- Create: `apps/api/src/common/request-id.middleware.ts`
- Create: `apps/api/src/common/request-context.middleware.ts`
- Create: `apps/api/src/common/http-exception.filter.ts`
- Create: `apps/api/src/common/logging.interceptor.ts`
- Create: `apps/api/src/common/decorators/current-user.decorator.ts`
- Create: `apps/api/src/common/decorators/public.decorator.ts`
- Create: `apps/api/src/common/decorators/roles.decorator.ts`
- Create: `apps/api/src/common/types/authenticated-request.ts`
- Create: `apps/api/src/common/common.module.ts`
- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: `apps/api/src/common/types/authenticated-request.ts`**

```typescript
import type { Request } from 'express';
import type { Role } from '@corpmind/shared';

export type AuthPrincipal = {
  userId: string;
  tenantId: string;
  role: Role;
  email: string;
};

export interface AuthenticatedRequest extends Request {
  user?: AuthPrincipal;
  requestId: string;
}
```

- [ ] **Step 2: `apps/api/src/common/request-id.middleware.ts`**

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import { v4 as uuid } from 'uuid';
import type { AuthenticatedRequest } from './types/authenticated-request.js';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const incoming = req.header('x-request-id');
    const id = incoming && incoming.length <= 64 ? incoming : uuid();
    req.requestId = id;
    res.setHeader('x-request-id', id);
    next();
  }
}
```

- [ ] **Step 3: `apps/api/src/common/request-context.middleware.ts`**

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import { requestContext } from './request-context.js';
import type { AuthenticatedRequest } from './types/authenticated-request.js';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
    requestContext.run({ requestId: req.requestId }, () => next());
  }
}
```

- [ ] **Step 4: `apps/api/src/common/http-exception.filter.ts`** — ProblemDetails

```typescript
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import type { AuthenticatedRequest } from './types/authenticated-request.js';

type ProblemDetails = {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<AuthenticatedRequest>();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'internal_error';
    let message = 'Internal server error';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resp = exception.getResponse();
      if (typeof resp === 'string') {
        message = resp;
      } else if (typeof resp === 'object' && resp !== null) {
        const r = resp as Record<string, unknown>;
        message = (r['message'] as string) ?? exception.message;
        code = (r['error'] as string) ?? defaultCodeFor(status);
        details = r['details'];
      }
      code = (code || defaultCodeFor(status)).toString();
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(exception.stack ?? message);
    }

    const body: ProblemDetails = {
      statusCode: status,
      code,
      message,
      ...(details !== undefined ? { details } : {}),
      requestId: req.requestId,
    };
    res.status(status).json(body);
  }
}

function defaultCodeFor(status: number): string {
  switch (status) {
    case 400: return 'bad_request';
    case 401: return 'unauthorized';
    case 403: return 'forbidden';
    case 404: return 'not_found';
    case 409: return 'conflict';
    case 422: return 'unprocessable_entity';
    case 429: return 'rate_limited';
    default: return status >= 500 ? 'internal_error' : 'error';
  }
}
```

- [ ] **Step 5: `apps/api/src/common/logging.interceptor.ts`**

```typescript
import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { AuthenticatedRequest } from './types/authenticated-request.js';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Http');

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const start = Date.now();
    const tag = `[${req.requestId}] ${req.method} ${req.originalUrl}`;
    return next.handle().pipe(
      tap({
        next: () => this.logger.log(`${tag} ${Date.now() - start}ms`),
        error: (err: Error) => this.logger.warn(`${tag} ERR ${err.message} ${Date.now() - start}ms`),
      }),
    );
  }
}
```

- [ ] **Step 6: `apps/api/src/common/decorators/current-user.decorator.ts`**

```typescript
import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { AuthenticatedRequest, AuthPrincipal } from '../types/authenticated-request.js';

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthPrincipal => {
  const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!req.user) throw new Error('No authenticated user on request');
  return req.user;
});
```

- [ ] **Step 7: `apps/api/src/common/decorators/public.decorator.ts`**

```typescript
import { SetMetadata } from '@nestjs/common';
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
```

- [ ] **Step 8: `apps/api/src/common/decorators/roles.decorator.ts`**

```typescript
import { SetMetadata } from '@nestjs/common';
import type { Role } from '@corpmind/shared';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator => SetMetadata(ROLES_KEY, roles);
```

- [ ] **Step 9: `apps/api/src/common/common.module.ts`**

```typescript
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RequestIdMiddleware } from './request-id.middleware.js';
import { RequestContextMiddleware } from './request-context.middleware.js';

@Module({})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware, RequestContextMiddleware).forRoutes('*');
  }
}
```

- [ ] **Step 10: Update `apps/api/src/main.ts`** — wire filter, interceptor, helmet, cors, cookies

```typescript
import 'reflect-metadata';
import { NestFactory, Reflector } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { loadEnv } from './config/env.js';
import { HttpExceptionFilter } from './common/http-exception.filter.js';
import { LoggingInterceptor } from './common/logging.interceptor.js';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.enableCors({ origin: env.WEB_ORIGIN, credentials: true });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.setGlobalPrefix('api/v1');

  await app.listen(env.API_PORT);
  Logger.log(`CorpMind API listening on http://localhost:${env.API_PORT}/api/v1`, 'Bootstrap');
}
void bootstrap();
```

- [ ] **Step 11: Update `apps/api/src/app.module.ts`** — register CommonModule

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { CommonModule } from './common/common.module.js';
import { AppController } from './app.controller.js';

@Module({
  imports: [ConfigModule, PrismaModule, CommonModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
```

- [ ] **Step 12: Smoke run + curl**

Run in terminal 1:
```bash
pnpm --filter @corpmind/api dev
```

In terminal 2:
```bash
curl -sS -i http://localhost:4000/api/v1/ping | head -5
curl -sS -i http://localhost:4000/api/v1/does-not-exist | head -10
```
Expected: ping returns 200 + `x-request-id` header; missing route returns 404 ProblemDetails JSON with `requestId`. Kill dev server.

- [ ] **Step 13: Commit**

```bash
git add apps/api/src/common/ apps/api/src/main.ts apps/api/src/app.module.ts
git commit -m "feat(api): add common module — request id, ALS context, error filter, logging"
```

---

### Task B7: Auth module — login, refresh, logout, me

**Files:**
- Create: `apps/api/src/auth/dto/login.dto.ts`
- Create: `apps/api/src/auth/dto/update-lang.dto.ts`
- Create: `apps/api/src/auth/jwt.strategy.ts`
- Create: `apps/api/src/auth/jwt.guard.ts`
- Create: `apps/api/src/auth/auth.service.ts`
- Create: `apps/api/src/auth/auth.controller.ts`
- Create: `apps/api/src/auth/auth.module.ts`
- Create: `apps/api/src/auth/password.ts`
- Create: `apps/api/src/auth/auth.service.spec.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: `apps/api/src/auth/password.ts`** — argon2 wrapper

```typescript
import * as argon2 from 'argon2';

const ARGON_OPTS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON_OPTS);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}
```

- [ ] **Step 2: `apps/api/src/auth/dto/login.dto.ts`**

```typescript
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
```

- [ ] **Step 3: `apps/api/src/auth/dto/update-lang.dto.ts`**

```typescript
import { IsIn } from 'class-validator';
import { Lang } from '@corpmind/shared';

export class UpdateLangDto {
  @IsIn([Lang.UZ, Lang.RU, Lang.EN])
  lang!: 'UZ' | 'RU' | 'EN';
}
```

- [ ] **Step 4: `apps/api/src/auth/jwt.strategy.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { loadEnv } from '../config/env.js';
import type { Role } from '@corpmind/shared';

export type JwtPayload = {
  sub: string;          // userId
  tid: string;          // tenantId
  role: Role;
  email: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    const env = loadEnv();
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req): string | null => {
          const cookie = req?.cookies?.['cm_access'];
          return typeof cookie === 'string' ? cookie : null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: env.JWT_ACCESS_SECRET,
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
```

- [ ] **Step 5: `apps/api/src/auth/jwt.guard.ts`** — honors @Public(), populates request.user

```typescript
import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator.js';
import { requestContext } from '../common/request-context.js';
import type { JwtPayload } from './jwt.strategy.js';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.js';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;
    const ok = (await super.canActivate(ctx)) as boolean;
    if (!ok) throw new UnauthorizedException();

    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const payload = req.user as unknown as JwtPayload;
    req.user = {
      userId: payload.sub,
      tenantId: payload.tid,
      role: payload.role,
      email: payload.email,
    };
    // Carry tenantId + userId into ALS so the Prisma extension auto-scopes
    const store = requestContext.getStore();
    if (store) {
      store.tenantId = payload.tid;
      store.userId = payload.sub;
    }
    return true;
  }
}
```

- [ ] **Step 6: `apps/api/src/auth/auth.service.ts`**

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { loadEnv } from '../config/env.js';
import { verifyPassword } from './password.js';
import type { AuthUser } from '@corpmind/shared';
import type { JwtPayload } from './jwt.strategy.js';
import type { Role, Lang, UserStatus } from '@corpmind/shared';

const REFRESH_TOKEN_BYTES = 48;

type LoginResult = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    // Use base prisma client (no tenant context yet during login)
    const user = await this.prisma.user.findFirst({ where: { email } });
    if (!user || user.status === 'INACTIVE') throw new UnauthorizedException('Invalid credentials');
    const ok = await verifyPassword(user.passwordHash, password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user.id, user.tenantId, user.role as Role, user.email, {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      fullName: user.fullName,
      role: user.role as Role,
      status: user.status as UserStatus,
      preferredLang: user.preferredLang as Lang,
      pointsTotal: user.pointsTotal,
    });
  }

  async refresh(rawToken: string): Promise<{ accessToken: string; refreshToken: string; refreshExpiresAt: Date }> {
    if (!rawToken) throw new UnauthorizedException('Missing refresh token');
    const hashed = this.hashRefresh(rawToken);
    const record = await this.prisma.refreshToken.findUnique({ where: { hashedToken: hashed } });
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const user = await this.prisma.user.findUnique({ where: { id: record.userId } });
    if (!user || user.status === 'INACTIVE') throw new UnauthorizedException('User not active');

    // rotate
    await this.prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
    const { accessToken, refreshToken, refreshExpiresAt } = await this.issueTokens(
      user.id, user.tenantId, user.role as Role, user.email,
    );
    return { accessToken, refreshToken, refreshExpiresAt };
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const hashed = this.hashRefresh(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { hashedToken: hashed, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getMe(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      fullName: user.fullName,
      role: user.role as Role,
      status: user.status as UserStatus,
      preferredLang: user.preferredLang as Lang,
      pointsTotal: user.pointsTotal,
    };
  }

  async updateLang(userId: string, lang: Lang): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { preferredLang: lang } });
  }

  private async issueTokens(
    userId: string,
    tenantId: string,
    role: Role,
    email: string,
    userPayload?: AuthUser,
  ): Promise<LoginResult & { user: AuthUser }> {
    const env = loadEnv();
    const payload: JwtPayload = { sub: userId, tid: tenantId, role, email };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: env.JWT_ACCESS_SECRET,
      expiresIn: env.JWT_ACCESS_TTL,
    });

    const rawRefresh = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
    const hashed = this.hashRefresh(rawRefresh);
    const refreshExpiresAt = new Date(Date.now() + this.ttlToMs(env.JWT_REFRESH_TTL));
    await this.prisma.refreshToken.create({
      data: { userId, hashedToken: hashed, expiresAt: refreshExpiresAt },
    });

    return {
      user:
        userPayload ?? {
          id: userId,
          tenantId,
          email,
          fullName: '',
          role,
          status: 'ACTIVE',
          preferredLang: 'UZ',
          pointsTotal: 0,
        },
      accessToken,
      refreshToken: rawRefresh,
      refreshExpiresAt,
    };
  }

  private hashRefresh(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  private ttlToMs(ttl: string): number {
    const m = /^(\d+)([smhd])$/.exec(ttl);
    if (!m) return 30 * 24 * 60 * 60 * 1000;
    const n = Number(m[1]);
    switch (m[2]) {
      case 's': return n * 1000;
      case 'm': return n * 60 * 1000;
      case 'h': return n * 60 * 60 * 1000;
      case 'd': return n * 24 * 60 * 60 * 1000;
      default:  return 30 * 24 * 60 * 60 * 1000;
    }
  }
}
```

- [ ] **Step 7: `apps/api/src/auth/auth.controller.ts`**

```typescript
import {
  Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Req, Res, UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { LoginDto } from './dto/login.dto.js';
import { UpdateLangDto } from './dto/update-lang.dto.js';
import { AuthService } from './auth.service.js';
import { Public } from '../common/decorators/public.decorator.js';
import { JwtGuard } from './jwt.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthPrincipal } from '../common/types/authenticated-request.js';
import type { Lang } from '@corpmind/shared';

const REFRESH_COOKIE = 'cm_refresh';
const ACCESS_COOKIE = 'cm_access';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response): Promise<{ user: unknown; accessToken: string }> {
    const result = await this.auth.login(dto.email, dto.password);
    this.setCookies(res, result.accessToken, result.refreshToken, result.refreshExpiresAt);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<{ accessToken: string }> {
    const raw = (req.cookies?.[REFRESH_COOKIE] as string | undefined) ?? '';
    const result = await this.auth.refresh(raw);
    this.setCookies(res, result.accessToken, result.refreshToken, result.refreshExpiresAt);
    return { accessToken: result.accessToken };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    await this.auth.logout(raw);
    res.clearCookie(ACCESS_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
  }

  @UseGuards(JwtGuard)
  @Get('me')
  me(@CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.auth.getMe(user.userId);
  }

  @UseGuards(JwtGuard)
  @Patch('me/lang')
  async updateLang(@CurrentUser() user: AuthPrincipal, @Body() dto: UpdateLangDto): Promise<{ ok: true }> {
    await this.auth.updateLang(user.userId, dto.lang as Lang);
    return { ok: true };
  }

  private setCookies(res: Response, access: string, refresh: string, refreshExpiresAt: Date): void {
    const common = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/' };
    res.cookie(ACCESS_COOKIE, access, { ...common, maxAge: 15 * 60 * 1000 });
    res.cookie(REFRESH_COOKIE, refresh, { ...common, expires: refreshExpiresAt });
  }
}
```

- [ ] **Step 8: `apps/api/src/auth/auth.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { loadEnv } from '../config/env.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtStrategy } from './jwt.strategy.js';
import { JwtGuard } from './jwt.guard.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => {
        const env = loadEnv();
        return { secret: env.JWT_ACCESS_SECRET, signOptions: { expiresIn: env.JWT_ACCESS_TTL } };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtGuard],
  exports: [AuthService, JwtGuard],
})
export class AuthModule {}
```

- [ ] **Step 9: `apps/api/src/auth/auth.service.spec.ts`** — unit test for password hashing

```typescript
import { hashPassword, verifyPassword } from './password.js';

describe('password hashing', () => {
  it('hashes and verifies a password', async () => {
    const hash = await hashPassword('SuperSecret123!');
    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(verifyPassword(hash, 'SuperSecret123!')).resolves.toBe(true);
    await expect(verifyPassword(hash, 'wrong')).resolves.toBe(false);
  });
});
```

- [ ] **Step 10: Register `AuthModule`** — update `apps/api/src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { CommonModule } from './common/common.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AppController } from './app.controller.js';

@Module({
  imports: [ConfigModule, PrismaModule, CommonModule, AuthModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
```

- [ ] **Step 11: Run tests**

Run:
```bash
pnpm --filter @corpmind/api test
```
Expected: all green (includes password hashing test).

- [ ] **Step 12: Commit**

```bash
git add apps/api/src/auth/ apps/api/src/app.module.ts
git commit -m "feat(api): add JWT auth — login/refresh/logout/me + lang update"
```

---

### Task B8: TenantGuard + RoleGuard + global guard registration

**Files:**
- Create: `apps/api/src/auth/tenant.guard.ts`
- Create: `apps/api/src/auth/roles.guard.ts`
- Create: `apps/api/src/auth/auth.providers.ts`
- Modify: `apps/api/src/auth/auth.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: `apps/api/src/auth/tenant.guard.ts`**

```typescript
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.js';
import { requestContext } from '../common/request-context.js';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req.user?.tenantId) throw new ForbiddenException('Tenant context missing');
    const store = requestContext.getStore();
    if (store) store.tenantId = req.user.tenantId;
    return true;
  }
}
```

- [ ] **Step 2: `apps/api/src/auth/roles.guard.ts`**

```typescript
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@corpmind/shared';
import { ROLES_KEY } from '../common/decorators/roles.decorator.js';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req.user) throw new ForbiddenException();
    if (!required.includes(req.user.role)) throw new ForbiddenException('Insufficient role');
    return true;
  }
}
```

- [ ] **Step 3: `apps/api/src/auth/auth.providers.ts`** — APP_GUARD wiring

```typescript
import { APP_GUARD } from '@nestjs/core';
import { JwtGuard } from './jwt.guard.js';
import { TenantGuard } from './tenant.guard.js';
import { RolesGuard } from './roles.guard.js';

export const AUTH_GLOBAL_GUARDS = [
  { provide: APP_GUARD, useClass: JwtGuard },
  { provide: APP_GUARD, useClass: TenantGuard },
  { provide: APP_GUARD, useClass: RolesGuard },
];
```

- [ ] **Step 4: Update `apps/api/src/auth/auth.module.ts`** — export guards

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { loadEnv } from '../config/env.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtStrategy } from './jwt.strategy.js';
import { JwtGuard } from './jwt.guard.js';
import { TenantGuard } from './tenant.guard.js';
import { RolesGuard } from './roles.guard.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => {
        const env = loadEnv();
        return { secret: env.JWT_ACCESS_SECRET, signOptions: { expiresIn: env.JWT_ACCESS_TTL } };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtGuard, TenantGuard, RolesGuard],
  exports: [AuthService, JwtGuard, TenantGuard, RolesGuard],
})
export class AuthModule {}
```

- [ ] **Step 5: Update `apps/api/src/app.module.ts`** — install global guards

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { CommonModule } from './common/common.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AppController } from './app.controller.js';
import { AUTH_GLOBAL_GUARDS } from './auth/auth.providers.js';

@Module({
  imports: [ConfigModule, PrismaModule, CommonModule, AuthModule],
  controllers: [AppController],
  providers: [...AUTH_GLOBAL_GUARDS],
})
export class AppModule {}
```

- [ ] **Step 6: Mark health/ping public** — update `apps/api/src/app.controller.ts`

```typescript
import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator.js';

@Controller()
export class AppController {
  @Public()
  @Get('ping')
  ping(): { ok: true } {
    return { ok: true };
  }
}
```

- [ ] **Step 7: Smoke check**

Run dev server; in another shell:
```bash
curl -i http://localhost:4000/api/v1/ping        # 200
curl -i http://localhost:4000/api/v1/auth/me     # 401 (no token)
```

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/auth/ apps/api/src/app.module.ts apps/api/src/app.controller.ts
git commit -m "feat(api): add TenantGuard, RolesGuard, global guard wiring"
```

---

### Task B9: Users module — list, create, status update, lang preference

**Files:**
- Create: `apps/api/src/users/dto/create-user.dto.ts`
- Create: `apps/api/src/users/dto/update-user.dto.ts`
- Create: `apps/api/src/users/dto/update-status.dto.ts`
- Create: `apps/api/src/users/users.service.ts`
- Create: `apps/api/src/users/users.controller.ts`
- Create: `apps/api/src/users/users.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: DTOs**

`apps/api/src/users/dto/create-user.dto.ts`:
```typescript
import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Role, Lang } from '@corpmind/shared';

export class CreateUserDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(2) @MaxLength(120) fullName!: string;
  @IsIn(Object.values(Role)) role!: 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN' | 'PLATFORM_ADMIN' | 'KNOWLEDGE_CURATOR';
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsString() position?: string;
  @IsOptional() @IsString() managerId?: string;
  @IsOptional() @IsIn(Object.values(Lang)) preferredLang?: 'UZ' | 'RU' | 'EN';
  @IsOptional() @IsString() @MinLength(8) @MaxLength(128) password?: string;
}
```

`apps/api/src/users/dto/update-user.dto.ts`:
```typescript
import { IsIn, IsOptional, IsString } from 'class-validator';
import { Role } from '@corpmind/shared';

export class UpdateUserDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsString() position?: string;
  @IsOptional() @IsString() managerId?: string;
  @IsOptional() @IsIn(Object.values(Role)) role?: 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN' | 'PLATFORM_ADMIN' | 'KNOWLEDGE_CURATOR';
}
```

`apps/api/src/users/dto/update-status.dto.ts`:
```typescript
import { IsIn } from 'class-validator';
import { UserStatus } from '@corpmind/shared';

export class UpdateStatusDto {
  @IsIn(Object.values(UserStatus)) status!: 'ACTIVE' | 'INVITED' | 'DEPARTING' | 'INACTIVE';
}
```

- [ ] **Step 2: `apps/api/src/users/users.service.ts`**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { hashPassword } from '../auth/password.js';
import type { CreateUserDto } from './dto/create-user.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';
import type { UpdateStatusDto } from './dto/update-status.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(page: number, pageSize: number): Promise<{ data: unknown[]; page: number; pageSize: number; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.scoped.user.findMany({
        select: {
          id: true, email: true, fullName: true, role: true, department: true, position: true,
          status: true, preferredLang: true, pointsTotal: true, managerId: true, startedAt: true, departingAt: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.scoped.user.count(),
    ]);
    return { data, page, pageSize, total };
  }

  async create(dto: CreateUserDto): Promise<{ id: string; email: string; tempPassword?: string }> {
    const tempPassword = dto.password ?? crypto.randomBytes(9).toString('base64url');
    const passwordHash = await hashPassword(tempPassword);
    const created = await this.prisma.scoped.user.create({
      data: {
        email: dto.email,
        fullName: dto.fullName,
        role: dto.role,
        department: dto.department ?? null,
        position: dto.position ?? null,
        managerId: dto.managerId ?? null,
        preferredLang: dto.preferredLang ?? 'UZ',
        passwordHash,
        status: 'INVITED',
      },
    });
    return { id: created.id, email: created.email, ...(dto.password ? {} : { tempPassword }) };
  }

  async update(id: string, dto: UpdateUserDto): Promise<{ ok: true }> {
    const updated = await this.prisma.scoped.user.updateMany({
      where: { id },
      data: { ...dto },
    });
    if (updated.count === 0) throw new NotFoundException('User not found');
    return { ok: true };
  }

  async updateStatus(id: string, dto: UpdateStatusDto): Promise<{ ok: true }> {
    const data: Record<string, unknown> = { status: dto.status };
    if (dto.status === 'DEPARTING') data['departingAt'] = new Date();
    if (dto.status === 'ACTIVE') data['departingAt'] = null;
    const updated = await this.prisma.scoped.user.updateMany({ where: { id }, data });
    if (updated.count === 0) throw new NotFoundException('User not found');
    return { ok: true };
  }
}
```

- [ ] **Step 3: `apps/api/src/users/users.controller.ts`**

```typescript
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateStatusDto } from './dto/update-status.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '@corpmind/shared';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles(Role.PLATFORM_ADMIN, Role.HR_ADMIN, Role.MANAGER)
  list(@Query('page') page = '1', @Query('pageSize') pageSize = '20'): Promise<unknown> {
    return this.users.list(Math.max(1, Number(page) || 1), Math.min(100, Math.max(1, Number(pageSize) || 20)));
  }

  @Post()
  @Roles(Role.PLATFORM_ADMIN, Role.HR_ADMIN)
  create(@Body() dto: CreateUserDto): Promise<unknown> {
    return this.users.create(dto);
  }

  @Patch(':id')
  @Roles(Role.PLATFORM_ADMIN, Role.HR_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto): Promise<unknown> {
    return this.users.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(Role.PLATFORM_ADMIN, Role.HR_ADMIN)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto): Promise<unknown> {
    return this.users.updateStatus(id, dto);
  }
}
```

- [ ] **Step 4: `apps/api/src/users/users.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 5: Register `UsersModule`** in `apps/api/src/app.module.ts`

Add `UsersModule` to imports list.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/users/ apps/api/src/app.module.ts
git commit -m "feat(api): add users module (list/create/update/status)"
```

---

### Task B10: Tenants module — current tenant info

**Files:**
- Create: `apps/api/src/tenants/tenants.service.ts`
- Create: `apps/api/src/tenants/tenants.controller.ts`
- Create: `apps/api/src/tenants/tenants.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: `apps/api/src/tenants/tenants.service.ts`**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { getTenantIdOrThrow } from '../common/request-context.js';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async current(): Promise<unknown> {
    const tenantId = getTenantIdOrThrow();
    // Read by primary key, bypassing the tenant-scoped extension for the tenant row itself
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      industry: tenant.industry,
      primaryLang: tenant.primaryLang,
      langs: tenant.langs,
      branding: tenant.branding,
    };
  }
}
```

- [ ] **Step 2: `apps/api/src/tenants/tenants.controller.ts`**

```typescript
import { Controller, Get } from '@nestjs/common';
import { TenantsService } from './tenants.service.js';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get('me')
  current(): Promise<unknown> {
    return this.tenants.current();
  }
}
```

- [ ] **Step 3: `apps/api/src/tenants/tenants.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { TenantsService } from './tenants.service.js';
import { TenantsController } from './tenants.controller.js';

@Module({
  controllers: [TenantsController],
  providers: [TenantsService],
})
export class TenantsModule {}
```

- [ ] **Step 4: Register `TenantsModule`** in `app.module.ts`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/tenants/ apps/api/src/app.module.ts
git commit -m "feat(api): add tenants module with /tenants/me"
```

---

### Task B11: Health endpoint + Throttler + Swagger

**Files:**
- Create: `apps/api/src/health/health.controller.ts`
- Create: `apps/api/src/health/health.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/main.ts`

- [ ] **Step 1: `apps/api/src/health/health.controller.ts`**

```typescript
import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Public } from '../common/decorators/public.decorator.js';
import Redis from 'ioredis';
import { loadEnv } from '../config/env.js';

@Controller('health')
export class HealthController {
  private readonly redis: Redis;
  constructor(private readonly prisma: PrismaService) {
    this.redis = new Redis(loadEnv().REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
  }

  @Public()
  @Get()
  async check(): Promise<{ status: string; postgres: string; redis: string }> {
    let pg = 'down';
    let rd = 'down';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      pg = 'up';
    } catch { /* keep "down" */ }
    try {
      if (this.redis.status !== 'ready') await this.redis.connect().catch(() => {});
      const pong = await this.redis.ping();
      rd = pong === 'PONG' ? 'up' : 'down';
    } catch { /* keep "down" */ }
    const status = pg === 'up' && rd === 'up' ? 'ok' : 'degraded';
    return { status, postgres: pg, redis: rd };
  }
}
```

- [ ] **Step 2: `apps/api/src/health/health.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';

@Module({ controllers: [HealthController] })
export class HealthModule {}
```

- [ ] **Step 3: Add `ThrottlerModule` to `app.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from './config/config.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { CommonModule } from './common/common.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { TenantsModule } from './tenants/tenants.module.js';
import { HealthModule } from './health/health.module.js';
import { AppController } from './app.controller.js';
import { AUTH_GLOBAL_GUARDS } from './auth/auth.providers.js';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    CommonModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    AuthModule,
    UsersModule,
    TenantsModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [...AUTH_GLOBAL_GUARDS, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
```

- [ ] **Step 4: Add Swagger UI to `main.ts`** (dev only)

Append before `app.listen`:
```typescript
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// ...
if (env.NODE_ENV !== 'production') {
  const config = new DocumentBuilder()
    .setTitle('CorpMind API')
    .setDescription('Internal API for the CorpMind platform')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, { swaggerOptions: { persistAuthorization: true } });
}
```

- [ ] **Step 5: Smoke**

```bash
pnpm --filter @corpmind/api dev
curl -s http://localhost:4000/api/v1/health | jq
# expected: { "status": "ok", "postgres": "up", "redis": "up" }
open http://localhost:4000/api/docs
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/health/ apps/api/src/app.module.ts apps/api/src/main.ts
git commit -m "feat(api): add /health, throttler guard, swagger docs (dev)"
```

---

## Phase C — Frontend (React + Vite) skeleton

### Task C1: Vite + React + TS + Tailwind scaffold

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/tsconfig.node.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.cjs`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/index.css`
- Create: `apps/web/.eslintrc.cjs`
- Create: `apps/web/.gitignore`
- Create: `apps/web/public/favicon.svg`

- [ ] **Step 1: `apps/web/package.json`**

```json
{
  "name": "@corpmind/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint \"src/**/*.{ts,tsx}\"",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests"
  },
  "dependencies": {
    "@corpmind/shared": "workspace:*",
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-dropdown-menu": "^2.1.2",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-popover": "^1.1.2",
    "@radix-ui/react-select": "^2.1.2",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.1",
    "@radix-ui/react-tooltip": "^1.1.3",
    "@tanstack/react-query": "^5.59.0",
    "axios": "^1.7.7",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "i18next": "^23.15.2",
    "i18next-browser-languagedetector": "^8.0.0",
    "lucide-react": "^0.453.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-i18next": "^15.0.2",
    "react-router-dom": "^6.27.0",
    "sonner": "^1.5.0",
    "tailwind-merge": "^2.5.4",
    "zod": "^3.23.8",
    "zustand": "^4.5.5"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.1",
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@types/node": "^20.16.10",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.0",
    "@typescript-eslint/eslint-plugin": "^8.8.1",
    "@typescript-eslint/parser": "^8.8.1",
    "@vitejs/plugin-react": "^4.3.2",
    "autoprefixer": "^10.4.20",
    "eslint": "^8.57.1",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-react-hooks": "^4.6.2",
    "eslint-plugin-react-refresh": "^0.4.12",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "tailwindcss-animate": "^1.0.7",
    "typescript": "^5.5.4",
    "vite": "^5.4.8",
    "vitest": "^2.1.2"
  }
}
```

- [ ] **Step 2: `apps/web/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "useDefineForClassFields": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "allowImportingTsExtensions": false,
    "isolatedModules": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "verbatimModuleSyntax": false,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src", "vite.config.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: `apps/web/tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "target": "ES2022"
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: `apps/web/vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL ?? 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

- [ ] **Step 5: `apps/web/tailwind.config.ts`** — shadcn-compatible config

```typescript
import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1rem', screens: { '2xl': '1440px' } },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [animate],
} satisfies Config;
```

- [ ] **Step 6: `apps/web/postcss.config.cjs`**

```javascript
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [ ] **Step 7: `apps/web/src/index.css`** — shadcn theme tokens (SQB-leaning indigo/teal palette)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 224 71% 4%;
    --card: 0 0% 100%;
    --card-foreground: 224 71% 4%;
    --primary: 221 83% 53%;
    --primary-foreground: 0 0% 100%;
    --secondary: 220 14% 96%;
    --secondary-foreground: 220 9% 18%;
    --muted: 220 14% 96%;
    --muted-foreground: 220 9% 46%;
    --accent: 173 80% 40%;
    --accent-foreground: 0 0% 100%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --border: 220 13% 91%;
    --input: 220 13% 91%;
    --ring: 221 83% 53%;
    --radius: 0.75rem;
  }

  .dark {
    --background: 224 71% 4%;
    --foreground: 210 20% 98%;
    --card: 224 71% 6%;
    --card-foreground: 210 20% 98%;
    --primary: 217 91% 60%;
    --primary-foreground: 0 0% 100%;
    --secondary: 217 32% 12%;
    --secondary-foreground: 210 20% 98%;
    --muted: 217 32% 12%;
    --muted-foreground: 215 20% 65%;
    --accent: 173 80% 40%;
    --accent-foreground: 0 0% 100%;
    --destructive: 0 63% 31%;
    --destructive-foreground: 210 20% 98%;
    --border: 217 32% 17%;
    --input: 217 32% 17%;
    --ring: 217 91% 60%;
  }

  html, body, #root { @apply h-full; }
  body { @apply bg-background text-foreground antialiased; }
}
```

- [ ] **Step 8: `apps/web/index.html`**

```html
<!doctype html>
<html lang="uz">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CorpMind</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 9: `apps/web/public/favicon.svg`** — quick brand mark

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#2563eb"/><text x="50%" y="56%" font-family="Inter,system-ui,sans-serif" font-size="14" font-weight="700" fill="#fff" text-anchor="middle">CM</text></svg>
```

- [ ] **Step 10: `apps/web/src/main.tsx`** — placeholder (real wiring in C5+)

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 11: `apps/web/src/App.tsx`** — temporary "hello" screen

```typescript
export function App(): JSX.Element {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="rounded-xl border bg-card p-8 shadow-sm text-center space-y-3 max-w-md">
        <h1 className="text-3xl font-semibold tracking-tight">CorpMind</h1>
        <p className="text-muted-foreground">Frontend skeleton — wiring in progress.</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 12: `apps/web/.eslintrc.cjs`**

```javascript
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
  ignorePatterns: ['dist', 'node_modules', '.eslintrc.cjs'],
};
```

- [ ] **Step 13: `apps/web/.gitignore`**

```
dist
node_modules
.cache
coverage
```

- [ ] **Step 14: `apps/web/src/test/setup.ts`** — vitest setup placeholder

```typescript
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 15: Install + dev smoke**

```bash
pnpm install
pnpm --filter @corpmind/web dev
# Open http://localhost:5173 — expect a "CorpMind — Frontend skeleton" card.
```

Kill dev server.

- [ ] **Step 16: Commit**

```bash
git add apps/web/ pnpm-lock.yaml
git commit -m "feat(web): scaffold Vite + React + Tailwind + shadcn theme tokens"
```

---

### Task C2: shadcn primitives — Button, Input, Label, Card, Toaster, util

**Files:**
- Create: `apps/web/src/lib/cn.ts`
- Create: `apps/web/src/components/ui/button.tsx`
- Create: `apps/web/src/components/ui/input.tsx`
- Create: `apps/web/src/components/ui/label.tsx`
- Create: `apps/web/src/components/ui/card.tsx`
- Create: `apps/web/src/components/ui/dropdown-menu.tsx`
- Create: `apps/web/src/components/ui/toaster.tsx`

- [ ] **Step 1: `apps/web/src/lib/cn.ts`**

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 2: `apps/web/src/components/ui/button.tsx`**

```typescript
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-6',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
  },
);
Button.displayName = 'Button';

export { buttonVariants };
```

- [ ] **Step 3: `apps/web/src/components/ui/input.tsx`**

```typescript
import * as React from 'react';
import { cn } from '@/lib/cn';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';
```

- [ ] **Step 4: `apps/web/src/components/ui/label.tsx`**

```typescript
import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/cn';

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn('text-sm font-medium leading-none', className)} {...props} />
));
Label.displayName = 'Label';
```

- [ ] **Step 5: `apps/web/src/components/ui/card.tsx`**

```typescript
import * as React from 'react';
import { cn } from '@/lib/cn';

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('rounded-xl border bg-card text-card-foreground shadow-sm', className)} {...props} />
));
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
));
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
));
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
));
CardFooter.displayName = 'CardFooter';
```

- [ ] **Step 6: `apps/web/src/components/ui/dropdown-menu.tsx`** — pull from shadcn (minimal)

```typescript
import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/cn';

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 min-w-[10rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        className,
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = 'DropdownMenuContent';

export const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground',
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = 'DropdownMenuItem';
```

- [ ] **Step 7: `apps/web/src/components/ui/toaster.tsx`**

```typescript
import { Toaster as Sonner } from 'sonner';
export const Toaster = (): JSX.Element => <Sonner richColors position="top-right" closeButton />;
```

- [ ] **Step 8: shadcn-required CSS popover token** — append to `src/index.css` `:root`

```css
:root {
  /* ...existing... */
  --popover: 0 0% 100%;
  --popover-foreground: 224 71% 4%;
}
.dark {
  /* ...existing... */
  --popover: 224 71% 6%;
  --popover-foreground: 210 20% 98%;
}
```

- [ ] **Step 9: Typecheck**

```bash
pnpm --filter @corpmind/web typecheck
```
Expected: pass.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/lib/ apps/web/src/components/ui/ apps/web/src/index.css
git commit -m "feat(web): add shadcn primitives (button, input, label, card, dropdown, toaster)"
```

---

### Task C3: i18next setup with uz/ru/en namespaces

**Files:**
- Create: `apps/web/src/i18n/index.ts`
- Create: `apps/web/src/i18n/locales/uz/common.json`
- Create: `apps/web/src/i18n/locales/uz/auth.json`
- Create: `apps/web/src/i18n/locales/ru/common.json`
- Create: `apps/web/src/i18n/locales/ru/auth.json`
- Create: `apps/web/src/i18n/locales/en/common.json`
- Create: `apps/web/src/i18n/locales/en/auth.json`

- [ ] **Step 1: `apps/web/src/i18n/index.ts`**

```typescript
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import uzCommon from './locales/uz/common.json';
import uzAuth from './locales/uz/auth.json';
import ruCommon from './locales/ru/common.json';
import ruAuth from './locales/ru/auth.json';
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'uz',
    supportedLngs: ['uz', 'ru', 'en'],
    defaultNS: 'common',
    ns: ['common', 'auth'],
    interpolation: { escapeValue: false },
    resources: {
      uz: { common: uzCommon, auth: uzAuth },
      ru: { common: ruCommon, auth: ruAuth },
      en: { common: enCommon, auth: enAuth },
    },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  });

export default i18n;
export const SUPPORTED_LANGS = ['uz', 'ru', 'en'] as const;
export type UiLang = (typeof SUPPORTED_LANGS)[number];
```

- [ ] **Step 2: Locale JSON files**

`apps/web/src/i18n/locales/uz/common.json`:
```json
{
  "appName": "CorpMind",
  "nav": {
    "home": "Bosh sahifa",
    "onboarding": "Adaptatsiya",
    "kb": "Bilim bazasi",
    "simulator": "Simulyator",
    "memory": "Xotira",
    "team": "Jamoa",
    "admin": "Boshqaruv"
  },
  "actions": {
    "save": "Saqlash",
    "cancel": "Bekor qilish",
    "logout": "Chiqish",
    "submit": "Yuborish"
  },
  "lang": { "uz": "O'zbekcha", "ru": "Русский", "en": "English" },
  "errors": {
    "generic": "Nimadir xato ketdi. Iltimos qaytadan urinib ko'ring.",
    "unauthorized": "Sessiya tugadi. Qayta kiring."
  }
}
```

`apps/web/src/i18n/locales/uz/auth.json`:
```json
{
  "login": {
    "title": "Tizimga kirish",
    "subtitle": "Ish elektron pochtangiz bilan kiring",
    "email": "Elektron pochta",
    "password": "Parol",
    "submit": "Kirish",
    "invalidCredentials": "Email yoki parol noto'g'ri"
  }
}
```

`apps/web/src/i18n/locales/ru/common.json`:
```json
{
  "appName": "CorpMind",
  "nav": {
    "home": "Главная",
    "onboarding": "Онбординг",
    "kb": "База знаний",
    "simulator": "Симулятор",
    "memory": "Память",
    "team": "Команда",
    "admin": "Администрирование"
  },
  "actions": { "save": "Сохранить", "cancel": "Отмена", "logout": "Выйти", "submit": "Отправить" },
  "lang": { "uz": "O'zbekcha", "ru": "Русский", "en": "English" },
  "errors": {
    "generic": "Что-то пошло не так. Повторите попытку.",
    "unauthorized": "Сессия истекла. Войдите снова."
  }
}
```

`apps/web/src/i18n/locales/ru/auth.json`:
```json
{
  "login": {
    "title": "Вход в систему",
    "subtitle": "Используйте рабочую почту",
    "email": "Электронная почта",
    "password": "Пароль",
    "submit": "Войти",
    "invalidCredentials": "Неверный email или пароль"
  }
}
```

`apps/web/src/i18n/locales/en/common.json`:
```json
{
  "appName": "CorpMind",
  "nav": {
    "home": "Home",
    "onboarding": "Onboarding",
    "kb": "Knowledge Base",
    "simulator": "Simulator",
    "memory": "Memory",
    "team": "Team",
    "admin": "Admin"
  },
  "actions": { "save": "Save", "cancel": "Cancel", "logout": "Logout", "submit": "Submit" },
  "lang": { "uz": "O'zbekcha", "ru": "Русский", "en": "English" },
  "errors": {
    "generic": "Something went wrong. Please try again.",
    "unauthorized": "Session expired. Please sign in again."
  }
}
```

`apps/web/src/i18n/locales/en/auth.json`:
```json
{
  "login": {
    "title": "Sign in",
    "subtitle": "Use your work email",
    "email": "Email",
    "password": "Password",
    "submit": "Sign in",
    "invalidCredentials": "Invalid email or password"
  }
}
```

- [ ] **Step 3: Enable JSON imports** — TS already does via `resolveJsonModule: true`. Verify typecheck:

```bash
pnpm --filter @corpmind/web typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/i18n/
git commit -m "feat(web): add i18next setup with uz/ru/en (common + auth namespaces)"
```

---

### Task C4: API client (axios) + SSE client + auth state (Zustand) + React Query

**Files:**
- Create: `apps/web/src/lib/api/client.ts`
- Create: `apps/web/src/lib/api/auth.ts`
- Create: `apps/web/src/lib/api/types.ts`
- Create: `apps/web/src/lib/sse.ts`
- Create: `apps/web/src/lib/stores/auth-store.ts`
- Create: `apps/web/src/lib/stores/ui-store.ts`
- Create: `apps/web/src/lib/query-client.ts`

- [ ] **Step 1: `apps/web/src/lib/api/types.ts`**

```typescript
export type Role = 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN' | 'PLATFORM_ADMIN' | 'KNOWLEDGE_CURATOR';
export type Lang = 'UZ' | 'RU' | 'EN';
export type UserStatus = 'ACTIVE' | 'INVITED' | 'DEPARTING' | 'INACTIVE';

export type AuthUser = {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  role: Role;
  status: UserStatus;
  preferredLang: Lang;
  pointsTotal: number;
};

export type LoginResponse = { user: AuthUser; accessToken: string };

export type ProblemDetails = {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
};
```

- [ ] **Step 2: `apps/web/src/lib/api/client.ts`** — axios with 401 refresh

```typescript
import axios, { AxiosError, type AxiosInstance } from 'axios';
import type { ProblemDetails } from './types';

const baseURL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000') + '/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
});

let accessToken: string | null = null;
let refreshInFlight: Promise<string | null> | null = null;
const subscribers: Array<(token: string | null) => void> = [];

export function setAccessToken(token: string | null): void {
  accessToken = token;
  subscribers.forEach((s) => s(token));
}
export function getAccessToken(): string | null {
  return accessToken;
}
export function onAccessTokenChange(cb: (token: string | null) => void): () => void {
  subscribers.push(cb);
  return () => {
    const idx = subscribers.indexOf(cb);
    if (idx !== -1) subscribers.splice(idx, 1);
  };
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError<ProblemDetails>) => {
    const original = error.config;
    if (!original) throw error;
    const isAuthEndpoint = (original.url ?? '').includes('/auth/');
    if (error.response?.status !== 401 || isAuthEndpoint || (original as { _retry?: boolean })._retry) {
      throw error;
    }
    (original as { _retry?: boolean })._retry = true;
    if (!refreshInFlight) {
      refreshInFlight = refreshToken();
    }
    const newToken = await refreshInFlight;
    refreshInFlight = null;
    if (!newToken) throw error;
    original.headers.Authorization = `Bearer ${newToken}`;
    return api.request(original);
  },
);

async function refreshToken(): Promise<string | null> {
  try {
    const { data } = await axios.post<{ accessToken: string }>(`${baseURL}/auth/refresh`, null, { withCredentials: true });
    setAccessToken(data.accessToken);
    return data.accessToken;
  } catch {
    setAccessToken(null);
    return null;
  }
}
```

- [ ] **Step 3: `apps/web/src/lib/api/auth.ts`**

```typescript
import { api, setAccessToken } from './client';
import type { AuthUser, LoginResponse } from './types';

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
  setAccessToken(data.accessToken);
  return data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
  setAccessToken(null);
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>('/auth/me');
  return data;
}

export async function updateLang(lang: 'UZ' | 'RU' | 'EN'): Promise<void> {
  await api.patch('/auth/me/lang', { lang });
}
```

- [ ] **Step 4: `apps/web/src/lib/sse.ts`** — minimal EventSource helper for later modules

```typescript
const baseURL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000') + '/api/v1';

export type SseHandlers = {
  onToken?: (chunk: string) => void;
  onEvent?: (eventName: string, data: string) => void;
  onError?: (err: Event) => void;
  onClose?: () => void;
};

export function openSse(path: string, handlers: SseHandlers): () => void {
  const url = path.startsWith('http') ? path : baseURL + path;
  const ev = new EventSource(url, { withCredentials: true });

  ev.addEventListener('token', (e) => {
    try {
      const data = JSON.parse((e as MessageEvent).data) as string;
      handlers.onToken?.(data);
    } catch {
      handlers.onToken?.((e as MessageEvent).data);
    }
  });

  ev.addEventListener('done', () => {
    handlers.onEvent?.('done', '');
    ev.close();
    handlers.onClose?.();
  });

  ev.onerror = (err) => {
    handlers.onError?.(err);
    ev.close();
    handlers.onClose?.();
  };

  return () => ev.close();
}
```

- [ ] **Step 5: `apps/web/src/lib/stores/auth-store.ts`**

```typescript
import { create } from 'zustand';
import type { AuthUser } from '../api/types';

type AuthState = {
  user: AuthUser | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  setUser: (user: AuthUser | null) => void;
  setStatus: (s: AuthState['status']) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'idle',
  setUser: (user) => set({ user, status: user ? 'authenticated' : 'unauthenticated' }),
  setStatus: (status) => set({ status }),
  clear: () => set({ user: null, status: 'unauthenticated' }),
}));
```

- [ ] **Step 6: `apps/web/src/lib/stores/ui-store.ts`**

```typescript
import { create } from 'zustand';

type UiState = {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  toggleSidebar: () => void;
  setTheme: (t: UiState['theme']) => void;
};

export const useUiStore = create<UiState>((set, get) => ({
  sidebarOpen: true,
  theme: 'light',
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
  setTheme: (theme) => set({ theme }),
}));
```

- [ ] **Step 7: `apps/web/src/lib/query-client.ts`**

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});
```

- [ ] **Step 8: Typecheck**

```bash
pnpm --filter @corpmind/web typecheck
```

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/lib/
git commit -m "feat(web): add api client (axios+refresh), sse helper, auth/ui stores, query client"
```

---

### Task C5: Router with role gates + shells + login page

**Files:**
- Create: `apps/web/src/router.tsx`
- Create: `apps/web/src/features/auth/LoginPage.tsx`
- Create: `apps/web/src/features/auth/ProtectedRoute.tsx`
- Create: `apps/web/src/features/auth/RoleGate.tsx`
- Create: `apps/web/src/components/shell/EmployeeShell.tsx`
- Create: `apps/web/src/components/shell/ManagerShell.tsx`
- Create: `apps/web/src/components/shell/AdminShell.tsx`
- Create: `apps/web/src/components/feature/LangSwitcher.tsx`
- Create: `apps/web/src/pages/HomePage.tsx`
- Create: `apps/web/src/pages/PlaceholderPage.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/main.tsx`

- [ ] **Step 1: `apps/web/src/features/auth/ProtectedRoute.tsx`**

```typescript
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { fetchMe } from '@/lib/api/auth';

export function ProtectedRoute(): JSX.Element {
  const { user, status, setUser, setStatus } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (status === 'idle') {
      setStatus('loading');
      fetchMe()
        .then((u) => setUser(u))
        .catch(() => setUser(null));
    }
  }, [status, setStatus, setUser]);

  if (status === 'idle' || status === 'loading') {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <Outlet />;
}
```

- [ ] **Step 2: `apps/web/src/features/auth/RoleGate.tsx`**

```typescript
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { Role } from '@/lib/api/types';

export function RoleGate({ allow }: { allow: Role[] }): JSX.Element {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to="/home" replace />;
  return <Outlet />;
}
```

- [ ] **Step 3: `apps/web/src/components/feature/LangSwitcher.tsx`**

```typescript
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { updateLang } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/stores/auth-store';

const LANG_MAP = { uz: 'UZ', ru: 'RU', en: 'EN' } as const;

export function LangSwitcher(): JSX.Element {
  const { i18n, t } = useTranslation('common');
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  async function change(lng: 'uz' | 'ru' | 'en'): Promise<void> {
    await i18n.changeLanguage(lng);
    if (user) {
      try {
        await updateLang(LANG_MAP[lng]);
        setUser({ ...user, preferredLang: LANG_MAP[lng] });
      } catch {
        // ignore server failure — UI lang still toggles
      }
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          {i18n.resolvedLanguage?.toUpperCase()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => void change('uz')}>{t('lang.uz')}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => void change('ru')}>{t('lang.ru')}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => void change('en')}>{t('lang.en')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 4: `apps/web/src/components/shell/EmployeeShell.tsx`**

```typescript
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LangSwitcher } from '@/components/feature/LangSwitcher';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/stores/auth-store';
import { logout } from '@/lib/api/auth';

const NAV: Array<{ to: string; key: 'home' | 'onboarding' | 'kb' | 'simulator' | 'memory' }> = [
  { to: '/home', key: 'home' },
  { to: '/onboarding', key: 'onboarding' },
  { to: '/kb', key: 'kb' },
  { to: '/simulator', key: 'simulator' },
  { to: '/memory', key: 'memory' },
];

export function EmployeeShell(): JSX.Element {
  const { t } = useTranslation('common');
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const nav = useNavigate();

  async function onLogout(): Promise<void> {
    await logout().catch(() => {});
    clear();
    nav('/login');
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:flex w-60 border-r p-4 flex-col gap-1 bg-muted/30">
        <div className="text-lg font-semibold px-3 py-2">{t('appName')}</div>
        {NAV.map((n) => (
          <NavLink
            key={n.key}
            to={n.to}
            className={({ isActive }) =>
              `px-3 py-2 rounded-md text-sm ${isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent'}`
            }
          >
            {t(`nav.${n.key}`)}
          </NavLink>
        ))}
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b flex items-center justify-between px-4 gap-3">
          <span className="font-medium text-sm">{user?.fullName}</span>
          <div className="flex items-center gap-2">
            <LangSwitcher />
            <Button variant="ghost" size="sm" onClick={() => void onLogout()}>{t('actions.logout')}</Button>
          </div>
        </header>
        <main className="flex-1 p-6 bg-background"><Outlet /></main>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: `apps/web/src/components/shell/ManagerShell.tsx`** — extends Employee nav with /team

```typescript
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LangSwitcher } from '@/components/feature/LangSwitcher';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/stores/auth-store';
import { logout } from '@/lib/api/auth';

const NAV = [
  { to: '/home', key: 'home' },
  { to: '/onboarding', key: 'onboarding' },
  { to: '/kb', key: 'kb' },
  { to: '/simulator', key: 'simulator' },
  { to: '/memory', key: 'memory' },
  { to: '/team', key: 'team' },
] as const;

export function ManagerShell(): JSX.Element {
  const { t } = useTranslation('common');
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const nav = useNavigate();
  async function onLogout(): Promise<void> {
    await logout().catch(() => {}); clear(); nav('/login');
  }
  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:flex w-60 border-r p-4 flex-col gap-1 bg-muted/30">
        <div className="text-lg font-semibold px-3 py-2">{t('appName')}</div>
        {NAV.map((n) => (
          <NavLink key={n.key} to={n.to}
            className={({ isActive }) =>
              `px-3 py-2 rounded-md text-sm ${isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent'}`}>
            {t(`nav.${n.key}`)}
          </NavLink>
        ))}
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b flex items-center justify-between px-4 gap-3">
          <span className="font-medium text-sm">{user?.fullName} · {t('nav.team')}</span>
          <div className="flex items-center gap-2">
            <LangSwitcher />
            <Button variant="ghost" size="sm" onClick={() => void onLogout()}>{t('actions.logout')}</Button>
          </div>
        </header>
        <main className="flex-1 p-6 bg-background"><Outlet /></main>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: `apps/web/src/components/shell/AdminShell.tsx`** — admin-only sidenav

```typescript
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LangSwitcher } from '@/components/feature/LangSwitcher';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/stores/auth-store';
import { logout } from '@/lib/api/auth';

const NAV: Array<{ to: string; label: string }> = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/documents', label: 'Documents' },
  { to: '/admin/scenarios', label: 'Scenarios' },
  { to: '/admin/onboarding', label: 'Onboarding' },
  { to: '/admin/projects', label: 'Projects' },
  { to: '/admin/settings', label: 'Settings' },
];

export function AdminShell(): JSX.Element {
  const { t } = useTranslation('common');
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const nav = useNavigate();
  async function onLogout(): Promise<void> {
    await logout().catch(() => {}); clear(); nav('/login');
  }
  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:flex w-60 border-r p-4 flex-col gap-1 bg-muted/30">
        <div className="text-lg font-semibold px-3 py-2">{t('appName')} · Admin</div>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end
            className={({ isActive }) =>
              `px-3 py-2 rounded-md text-sm ${isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent'}`}>
            {n.label}
          </NavLink>
        ))}
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b flex items-center justify-between px-4 gap-3">
          <span className="font-medium text-sm">{user?.fullName}</span>
          <div className="flex items-center gap-2">
            <LangSwitcher />
            <Button variant="ghost" size="sm" onClick={() => void onLogout()}>{t('actions.logout')}</Button>
          </div>
        </header>
        <main className="flex-1 p-6 bg-background"><Outlet /></main>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: `apps/web/src/features/auth/LoginPage.tsx`**

```typescript
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { login } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/stores/auth-store';
import { LangSwitcher } from '@/components/feature/LangSwitcher';
import { toast } from 'sonner';

export function LoginPage(): JSX.Element {
  const { t } = useTranslation(['auth', 'common']);
  const nav = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/home';

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { user } = await login(email, password);
      setUser(user);
      nav(from, { replace: true });
    } catch {
      toast.error(t('login.invalidCredentials'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="absolute top-4 right-4"><LangSwitcher /></div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('login.title')}</CardTitle>
          <CardDescription>{t('login.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
            <div className="space-y-2">
              <Label htmlFor="email">{t('login.email')}</Label>
              <Input id="email" type="email" autoComplete="email" required
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('login.password')}</Label>
              <Input id="password" type="password" autoComplete="current-password" required
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? '…' : t('login.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 8: `apps/web/src/pages/HomePage.tsx`**

```typescript
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/lib/stores/auth-store';

export function HomePage(): JSX.Element {
  const { t } = useTranslation('common');
  const user = useAuthStore((s) => s.user);
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">{t('nav.home')}</h1>
      <Card>
        <CardHeader><CardTitle>Hello, {user?.fullName}</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>Role: {user?.role}</p>
          <p>Tenant: {user?.tenantId}</p>
          <p>Preferred lang: {user?.preferredLang}</p>
          <p>Points: {user?.pointsTotal}</p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 9: `apps/web/src/pages/PlaceholderPage.tsx`**

```typescript
export function PlaceholderPage({ title }: { title: string }): JSX.Element {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">Coming in a later plan.</p>
    </div>
  );
}
```

- [ ] **Step 10: `apps/web/src/router.tsx`**

```typescript
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { LoginPage } from '@/features/auth/LoginPage';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { RoleGate } from '@/features/auth/RoleGate';
import { EmployeeShell } from '@/components/shell/EmployeeShell';
import { ManagerShell } from '@/components/shell/ManagerShell';
import { AdminShell } from '@/components/shell/AdminShell';
import { HomePage } from '@/pages/HomePage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { useAuthStore } from '@/lib/stores/auth-store';

function RootRedirect(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'PLATFORM_ADMIN' || user.role === 'HR_ADMIN') return <Navigate to="/admin" replace />;
  if (user.role === 'MANAGER') return <Navigate to="/team" replace />;
  return <Navigate to="/home" replace />;
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/', element: <RootRedirect /> },

      // Employee shell
      {
        element: <EmployeeShell />,
        children: [
          { path: '/home', element: <HomePage /> },
          { path: '/onboarding', element: <PlaceholderPage title="Onboarding" /> },
          { path: '/kb', element: <PlaceholderPage title="Knowledge Base" /> },
          { path: '/simulator', element: <PlaceholderPage title="Simulator" /> },
          { path: '/memory', element: <PlaceholderPage title="Memory" /> },
        ],
      },

      // Manager
      {
        element: <RoleGate allow={['MANAGER', 'PLATFORM_ADMIN', 'HR_ADMIN']} />,
        children: [
          {
            element: <ManagerShell />,
            children: [{ path: '/team', element: <PlaceholderPage title="Team" /> }],
          },
        ],
      },

      // Admin
      {
        element: <RoleGate allow={['PLATFORM_ADMIN', 'HR_ADMIN']} />,
        children: [
          {
            element: <AdminShell />,
            children: [
              { path: '/admin', element: <PlaceholderPage title="Admin dashboard" /> },
              { path: '/admin/users', element: <PlaceholderPage title="Users" /> },
              { path: '/admin/documents', element: <PlaceholderPage title="Documents" /> },
              { path: '/admin/scenarios', element: <PlaceholderPage title="Scenarios" /> },
              { path: '/admin/onboarding', element: <PlaceholderPage title="Onboarding templates" /> },
              { path: '/admin/projects', element: <PlaceholderPage title="Projects" /> },
              { path: '/admin/settings', element: <PlaceholderPage title="Settings" /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
```

- [ ] **Step 11: Replace `apps/web/src/App.tsx`**

```typescript
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { router } from './router';
import { queryClient } from './lib/query-client';
import { Toaster } from './components/ui/toaster';

export function App(): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 12: Update `apps/web/src/main.tsx`** — bootstrap i18n

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
import './i18n';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 13: Smoke**

```bash
pnpm --filter @corpmind/web dev
# Open http://localhost:5173 → redirected to /login. Try entering anything: expect 401 toast.
```

- [ ] **Step 14: Commit**

```bash
git add apps/web/src/
git commit -m "feat(web): router with role gates, employee/manager/admin shells, login page"
```

---

## Phase D — Seed + verification

### Task D1: Seed script for SQB demo users + tenant

> Full demo data (documents, simulator scenarios, persona content) is seeded by **Plan 2+** as each module ships. This task seeds only what Plan 1 needs: the tenant, the 5 named users with hashed passwords, an empty default project, and one empty onboarding template shell.

**Files:**
- Create: `apps/api/prisma/seed.ts`
- Modify: `apps/api/package.json` already configured `"prisma": { "seed": "tsx prisma/seed.ts" }` in B1 — verify

- [ ] **Step 1: `apps/api/prisma/seed.ts`**

```typescript
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const TENANT_SLUG = process.env.DEMO_TENANT_SLUG ?? 'sqb';
const TENANT_NAME = process.env.DEMO_TENANT_NAME ?? 'SQB Bank';

type SeedUser = {
  email: string;
  fullName: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN' | 'PLATFORM_ADMIN' | 'KNOWLEDGE_CURATOR';
  status?: 'ACTIVE' | 'DEPARTING';
  department?: string;
  position?: string;
  startedDaysAgo?: number;
  managerEmail?: string;
};

const USERS: SeedUser[] = [
  { email: 'aziz@sqb.uz',    fullName: 'Aziz Karimov',     role: 'EMPLOYEE', status: 'DEPARTING', department: 'Credit', position: 'Senior Credit Officer', startedDaysAgo: 5 * 365 },
  { email: 'malika@sqb.uz',  fullName: 'Malika Yusupova',  role: 'MANAGER',  department: 'Credit', position: 'Credit Department Head', startedDaysAgo: 8 * 365 },
  { email: 'bekzod@sqb.uz',  fullName: 'Bekzod Toirov',    role: 'EMPLOYEE', department: 'Credit', position: 'Credit Officer', startedDaysAgo: 0, managerEmail: 'malika@sqb.uz' },
  { email: 'nigora@sqb.uz',  fullName: 'Nigora Saidova',   role: 'HR_ADMIN', department: 'HR',     position: 'HR Lead', startedDaysAgo: 3 * 365 },
  { email: 'dilshod@sqb.uz', fullName: 'Dilshod Rakhimov', role: 'EMPLOYEE', department: 'Credit', position: 'Credit Officer', startedDaysAgo: 14, managerEmail: 'malika@sqb.uz' },
];

async function main(): Promise<void> {
  console.log(`Seeding tenant ${TENANT_NAME} (${TENANT_SLUG})…`);
  const tenant = await prisma.tenant.upsert({
    where: { slug: TENANT_SLUG },
    update: {},
    create: {
      slug: TENANT_SLUG,
      name: TENANT_NAME,
      industry: 'banking',
      primaryLang: 'UZ',
      langs: ['UZ', 'RU', 'EN'],
      branding: { colors: { primary: '#1d4ed8', accent: '#0d9488' }, platformName: 'CorpMind' },
    },
  });

  const passwordHash = await argon2.hash('Demo123!', { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 });

  // Two-pass to satisfy managerId references
  const created = new Map<string, string>();
  for (const u of USERS) {
    const existing = await prisma.user.findFirst({ where: { tenantId: tenant.id, email: u.email } });
    if (existing) { created.set(u.email, existing.id); continue; }
    const rec = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        status: u.status ?? 'ACTIVE',
        department: u.department ?? null,
        position: u.position ?? null,
        preferredLang: 'UZ',
        passwordHash,
        startedAt: u.startedDaysAgo !== undefined ? new Date(Date.now() - u.startedDaysAgo * 86_400_000) : null,
        departingAt: u.status === 'DEPARTING' ? new Date() : null,
      },
    });
    created.set(u.email, rec.id);
  }
  for (const u of USERS) {
    if (!u.managerEmail) continue;
    const userId = created.get(u.email);
    const managerId = created.get(u.managerEmail);
    if (userId && managerId) {
      await prisma.user.update({ where: { id: userId }, data: { managerId } });
    }
  }

  await prisma.project.upsert({
    where: { id: `${tenant.id}-bootstrap` },
    update: {},
    create: { id: `${tenant.id}-bootstrap`, tenantId: tenant.id, name: 'General', department: 'Credit', status: 'active' },
  });

  await prisma.onboardingTemplate.upsert({
    where: { id: `${tenant.id}-credit-5d` },
    update: {},
    create: {
      id: `${tenant.id}-credit-5d`,
      tenantId: tenant.id,
      role: 'credit_officer',
      name: 'Credit Officer 5-day',
      isActive: true,
    },
  });

  console.log(`Seed complete. Users: ${created.size}. Login password: Demo123!`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run seed**

```bash
pnpm db:seed
```
Expected: `Seed complete. Users: 5. Login password: Demo123!`

- [ ] **Step 3: Verify in psql**

```bash
docker exec corpmind-pg psql -U corpmind -d corpmind -c \
  "SELECT email, role, status FROM \"User\" ORDER BY email;"
```
Expected: 5 rows.

- [ ] **Step 4: Stub `ingest:demo` script** so `pnpm demo:bootstrap` doesn't crash before Plan 2

Create `apps/api/src/scripts/ingest-demo-docs.ts`:
```typescript
console.log('ingest-demo-docs: no-op for Plan 1 (documents seeded in Plan 2).');
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/seed.ts apps/api/src/scripts/ingest-demo-docs.ts
git commit -m "feat(api): seed SQB tenant + 5 demo users + bootstrap project/template"
```

---

### Task D2: End-to-end manual smoke + Playwright golden path

**Files:**
- Create: `apps/web/playwright.config.ts`
- Create: `apps/web/e2e/login.spec.ts`
- Modify: `apps/web/package.json` (add `test:e2e` script)

- [ ] **Step 1: Run `pnpm demo:bootstrap`** (from project root, clean state)

Optional: reset first:
```bash
docker compose down -v
pnpm demo:bootstrap
```
Expected: containers up, migrations applied, seed runs, ingest no-ops cleanly.

- [ ] **Step 2: Run dev**

```bash
pnpm dev
```
Open http://localhost:5173 and verify manually:
- Redirected to `/login`
- Login as `bekzod@sqb.uz` / `Demo123!` → lands on `/home`
- Lang switcher uz ↔ ru ↔ en updates the visible UI strings; refresh persists
- Visiting `/admin` redirects to `/home` (Bekzod is EMPLOYEE)
- Logout returns to `/login`
- Login as `nigora@sqb.uz` (HR_ADMIN) → lands on `/admin` shell
- Login as `malika@sqb.uz` (MANAGER) → lands on `/team`

- [ ] **Step 3: `apps/web/playwright.config.ts`**

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
```

- [ ] **Step 4: `apps/web/e2e/login.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test('employee can log in and see home', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email|Email|почта|pochta/i).fill('bekzod@sqb.uz');
  await page.getByLabel(/password|пароль|parol/i).fill('Demo123!');
  await page.getByRole('button', { name: /kirish|Sign in|Войти/i }).click();
  await expect(page).toHaveURL(/\/home$/);
});

test('lang switcher updates UI', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email|Email|почта|pochta/i).fill('bekzod@sqb.uz');
  await page.getByLabel(/password|пароль|parol/i).fill('Demo123!');
  await page.getByRole('button', { name: /kirish|Sign in|Войти/i }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.getByRole('button', { name: /UZ|RU|EN/ }).click();
  await page.getByRole('menuitem', { name: /English/ }).click();
  await expect(page.getByRole('heading', { name: /Home/ })).toBeVisible();
});

test('admin redirected to admin shell', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email|Email|почта|pochta/i).fill('nigora@sqb.uz');
  await page.getByLabel(/password|пароль|parol/i).fill('Demo123!');
  await page.getByRole('button', { name: /kirish|Sign in|Войти/i }).click();
  await expect(page).toHaveURL(/\/admin$/);
});
```

- [ ] **Step 5: Add web `test:e2e` script**

In `apps/web/package.json` `scripts` add:
```json
"test:e2e": "playwright test"
```

- [ ] **Step 6: Install Playwright browsers (one-time)**

```bash
pnpm --filter @corpmind/web exec playwright install --with-deps chromium
```

- [ ] **Step 7: Run e2e**

```bash
pnpm --filter @corpmind/web test:e2e
```
Expected: 3 tests pass.

- [ ] **Step 8: Commit**

```bash
git add apps/web/playwright.config.ts apps/web/e2e/ apps/web/package.json pnpm-lock.yaml
git commit -m "test(web): playwright golden path — login, lang switch, role redirect"
```

---

### Task D3: Repository CLAUDE.md + plan completion marker

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Write `CLAUDE.md`** (so future agent sessions inherit context)

```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

CorpMind — AI-powered corporate learning & knowledge platform (hackathon MVP). Demo client: SQB Bank. Generic B2B SaaS.

## Commands

| Action | Command |
|---|---|
| Bootstrap demo | `pnpm demo:bootstrap` |
| Start dev (api + web) | `pnpm dev` |
| API only | `pnpm dev:api` |
| Web only | `pnpm dev:web` |
| Typecheck | `pnpm typecheck` |
| Lint | `pnpm lint` |
| Tests (api + web unit) | `pnpm test` |
| API e2e | `pnpm --filter @corpmind/api test:e2e` |
| Web Playwright | `pnpm --filter @corpmind/web test:e2e` |
| Reset DB | `pnpm db:reset` |
| New migration | `pnpm --filter @corpmind/api exec prisma migrate dev --name <name>` |
| Generate Prisma client | `pnpm --filter @corpmind/api prisma:gen` |

## Architecture (big picture)

- **Monorepo** (pnpm workspaces): `apps/api` (NestJS), `apps/web` (React+Vite), `packages/shared` (zod schemas, enums, DTO types).
- **Backend** is NestJS + TypeScript strict + Prisma + PostgreSQL 16 (pgvector) + Redis (BullMQ). Override of docs which suggested FastAPI.
- **Multi-tenant** is enforced by a Prisma extension (`apps/api/src/prisma/tenant-extension.ts`) that auto-filters reads and auto-injects `tenantId` on writes for tenant-scoped models, using `AsyncLocalStorage` (`apps/api/src/common/request-context.ts`). The tenant is populated by `TenantGuard` after `JwtGuard`. Inside a service, prefer `prisma.scoped.<model>` over `prisma.<model>` when you want auto-scoping; the unscoped client is reserved for seeds, migrations, and explicit cross-tenant queries.
- **Auth**: JWT access (15m) + refresh (30d, rotating). Refresh tokens are sha256-hashed in `RefreshToken`. SSE endpoints accept the access token via httpOnly `cm_access` cookie because `EventSource` cannot set headers. Global guards (`JwtGuard`, `TenantGuard`, `RolesGuard`) are registered in `app.module.ts` via `APP_GUARD`; opt-out with `@Public()` or `@Roles(...)`.
- **AI** (added in Plan 2): all OpenAI calls funnel through `apps/api/src/ai/openai.client.ts`. Model selection is env-driven (`OPENAI_MODEL_*`). RAG is hybrid: pgvector cosine + tsvector keyword fused via Reciprocal Rank Fusion. See spec §3.
- **Frontend** uses React Router with three shells (Employee, Manager, Admin), shadcn/ui primitives, React Query for server state, Zustand for UI state, i18next for uz/ru/en. The axios client (`apps/web/src/lib/api/client.ts`) automatically retries 401s through the refresh endpoint exactly once.

## Authoritative documents

- Design spec: `docs/superpowers/specs/2026-05-23-corpmind-mvp-design.md` (single source of truth for data model, prompts, API surface, demo flow)
- Implementation plans (one per phase): `docs/superpowers/plans/2026-05-23-plan-N-*.md`. Plan 1 (Foundation) is shipped; Plans 2–7 add documents+KB, onboarding, simulator, memory, dashboard, polish.

## Conventions

- TS strict everywhere; no `any` without a written reason.
- No `console.log` in src (use Nest `Logger`); fine in seed/scripts.
- Each NestJS feature lives in its own folder with `*.module.ts`, `*.controller.ts`, `*.service.ts`, and a `dto/` subfolder.
- React feature folders mirror domain (`features/auth`, `features/onboarding`, etc.); shared primitives in `components/ui/`, cross-feature widgets in `components/feature/`.
- Demo password for all seed users: `Demo123!`.

## Known not-yet-implemented (per plan sequence)

- KB / RAG (Plan 2), Onboarding (Plan 3), Simulator (Plan 4), Memory (Plan 5), Dashboard (Plan 6), Gamification + voice + final demo polish (Plan 7).
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md for future agent sessions"
```

---

## Definition of Done — verify end-to-end

Run, in order:

```bash
docker compose down -v
pnpm install
pnpm demo:bootstrap
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter @corpmind/web test:e2e
```

Expected:
- All commands exit 0.
- Playwright reports 3/3 tests passing.
- `curl -s http://localhost:4000/api/v1/health | jq` returns `{ "status": "ok", "postgres": "up", "redis": "up" }`.
- Login as `bekzod@sqb.uz` / `Demo123!` from the browser shows the employee shell.

If all of the above hold, Plan 1 is complete and Plan 2 (Documents + KB Assistant) can begin.

---

## Plan-author self-review

After writing this plan, the author (Claude) ran the self-review checklist from the writing-plans skill:

**1. Spec coverage** — Plan 1 covers spec §0 (top-line decisions), §1 (architecture — guards, ALS, SSE prerequisites), §2 (full Prisma schema + pgvector), §5 (dev infra — monorepo, Docker, env, bootstrap, observability hooks, code quality). Spec §3 (AI orchestration), §4 (per-module APIs/routes/demo flow beyond auth), and §6–§8 belong to later plans by design.

**2. Placeholder scan** — No "TBD", "TODO", or "fill in later" in any task. Every step contains actual code or actual commands.

**3. Type consistency** — Names match across tasks: `AuthPrincipal`, `JwtPayload` (`sub`/`tid`/`role`/`email`), `AuthUser` (shared), `Role`/`Lang`/`UserStatus` enums identical between `@corpmind/shared` and Prisma. The Prisma extension consistently uses `prisma.scoped.<model>` and that convention is documented in CLAUDE.md.

**4. Ambiguity check** — One subtlety is called out: the `ingest:demo` script is intentionally a no-op in Plan 1 (Task D1 Step 4) so `pnpm demo:bootstrap` succeeds; Plan 2 replaces it with the real ingest pipeline. Demo password is fixed at `Demo123!` (seed + CLAUDE.md + e2e all reference the same string).
