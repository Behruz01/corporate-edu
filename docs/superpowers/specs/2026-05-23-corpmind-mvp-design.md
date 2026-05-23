# CorpMind MVP — Design Spec

> **Status:** Draft for implementation
> **Date:** 2026-05-23
> **Source brief:** `/Users/Macbook/Downloads/CorpMind_Project_Docs.md`
> **Repo:** `corporate-edu`
> **Audience:** implementation agents (Codex CLI driven by Claude orchestrator)

This spec consolidates the brainstorming decisions for the CorpMind hackathon MVP. It is the contract that the implementation plan will be derived from. **Backend is NestJS + TypeScript (strict)** — overriding the FastAPI suggestion in the source brief.

---

## 0. Top-line decisions

| Area | Decision |
|---|---|
| Repo | pnpm workspaces: `apps/web`, `apps/api`, `packages/shared` |
| Backend | NestJS + TS strict + Prisma + JWT (access+refresh) + PostgreSQL 16 + pgvector |
| Frontend | React + Vite + TS + Tailwind + shadcn/ui + React Query + Zustand + i18next |
| AI provider | OpenAI: `gpt-4o` (scoring/persona), `gpt-4o-mini` (chat), `text-embedding-3-small`, `whisper-1` |
| Queue/cache | Redis + BullMQ |
| Storage | Local filesystem (`apps/api/storage/`) |
| Deploy | Local laptop, `docker compose up` + `pnpm dev` |
| Real-time | SSE (NestJS `@Sse()` + RxJS, browser `EventSource`) |
| RAG | Hybrid: pgvector cosine + tsvector keyword, fused with RRF (k=60), top-5 |
| Persona | RAG over per-employee `PersonaChunk` index with first-person voice prompt |
| Roles | EMPLOYEE, MANAGER, HR_ADMIN, PLATFORM_ADMIN, KNOWLEDGE_CURATOR |
| Scope | Full MVP per source brief §10 Must Have + Should Have + Nice to Have |
| Languages | UI: uz/ru/en (i18next). AI: answers in same language as the user's input |
| Demo client | SQB Bank (single-tenant by default, multi-tenant infra in place) |
| Codex flow | Claude writes the implementation plan; Claude drives Codex CLI per task and verifies output |

---

## 1. System architecture

### 1.1 High-level diagram

```
┌────────────────────────────────────────────────────────────────┐
│                      Browser (React SPA)                       │
│                                                                │
│  Onboarding │ KB Chat │ Simulator │ Memory │ Dashboard │ Admin │
│                                                                │
│  React Router │ React Query (server state) │ Zustand (UI)      │
│  shadcn/ui    │ i18next (uz/ru/en)         │ Tailwind          │
└──────────────────┬─────────────────────────────────────────────┘
                   │ REST (JSON) + SSE (chat/scoring stream)
                   │ Bearer JWT (header) + httpOnly cookie (SSE)
┌──────────────────▼─────────────────────────────────────────────┐
│                  NestJS API (apps/api)                         │
│                                                                │
│  Guards: JwtGuard → TenantGuard → RoleGuard                    │
│  Interceptors: Logging, TenantScope, Serializer                │
│                                                                │
│  Feature modules: auth, tenants, users, onboarding, kb,        │
│  documents, simulator, scenarios, memory, dashboard,           │
│  gamification, notifications                                   │
│                                                                │
│  Shared modules: ai, storage, queue, i18n, prisma, common      │
└──────────────────┬─────────────────────────────────────────────┘
                   │
       ┌───────────┼────────────┬──────────────┐
       ▼           ▼            ▼              ▼
   PostgreSQL  Redis         Local FS       OpenAI API
   + pgvector  (BullMQ +     storage/       (chat, embeddings,
   (prisma)    cache)        uploads/       whisper)
```

### 1.2 Cross-cutting flows

**RAG KB question (SSE):**
```
Browser POST /api/v1/kb/ask
  → JwtGuard → TenantGuard
  → KbController.ask → KbService.ask
  → AiService.embedQuery(question)
  → RagService.hybridSearch(tenantId, embedding, question)
      pgvector cosine top-20 + tsvector top-20 → RRF (k=60) → top-5
  → PromptBuilder.kbAnswer(question, chunks, history, langPolicy)
  → AiService.streamChat(messages) → SSE token stream to browser
  → on done: persist Message + Citation[] + parallel NextStep suggestion
```

**Simulator scenario:**
```
POST /simulator/sessions { scenarioId } → { sessionId } + SSE persona intro
POST /simulator/sessions/:id/turn { text }   → SSE persona response (gpt-4o-mini)
POST /simulator/sessions/:id/end             → ScoringService (gpt-4o JSON mode)
  → SimulatorScore + KnowledgeBridge (weak areas → KB docs + personas)
```

### 1.3 Multi-tenant enforcement

- JWT payload carries `tenantId` claim.
- `TenantGuard` populates `RequestContext` (AsyncLocalStorage).
- `PrismaService.$extends({ query })` middleware auto-injects `tenantId` filter on every read and auto-assigns on every create.
- Cross-tenant access throws `BAD_REQUEST` (defense in depth).
- All vector queries include `WHERE "tenantId" = $n` explicitly (raw SQL is outside Prisma's extension).

### 1.4 Real-time / SSE pattern

NestJS `@Sse()` returns `Observable<MessageEvent>`. AI streaming wraps `openai.chat.completions.create({ stream: true })` in `Observable`. Browser uses `EventSource`. JWT for SSE goes via httpOnly cookie `cm_access` (since `EventSource` cannot set headers).

---

## 2. Data model (Prisma schema)

### 2.1 Foundation

```prisma
model Tenant {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  industry    String
  primaryLang Lang     @default(UZ)
  langs       Lang[]
  branding    Json?
  createdAt   DateTime @default(now())
  users       User[]
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
  tenant        Tenant     @relation(fields: [tenantId], references: [id])
  @@unique([tenantId, email])
}

model RefreshToken {
  id          String   @id @default(cuid())
  userId      String
  hashedToken String
  expiresAt   DateTime
  revokedAt   DateTime?
}

enum Lang       { UZ RU EN }
enum Role       { EMPLOYEE MANAGER HR_ADMIN PLATFORM_ADMIN KNOWLEDGE_CURATOR }
enum UserStatus { ACTIVE INVITED DEPARTING INACTIVE }
```

### 2.2 Onboarding

```prisma
model OnboardingTemplate {
  id        String          @id @default(cuid())
  tenantId  String
  role      String
  name      String
  isActive  Boolean         @default(true)
  days      OnboardingDay[]
}

model OnboardingDay {
  id           String            @id @default(cuid())
  templateId   String
  dayNumber    Int
  title        String
  description  String
  estimatedMin Int
  topics       OnboardingTopic[]
  quiz         Quiz?
}

model OnboardingTopic {
  id          String   @id @default(cuid())
  dayId       String
  order       Int
  title       String
  content     String
  documentIds String[]
}

model OnboardingAssignment {
  id          String                  @id @default(cuid())
  tenantId    String
  userId      String
  templateId  String
  startedAt   DateTime
  currentDay  Int                     @default(1)
  status      OnboardingStatus        @default(IN_PROGRESS)
  dayProgress OnboardingDayProgress[]
}

model OnboardingDayProgress {
  id           String    @id @default(cuid())
  assignmentId String
  dayId        String
  startedAt    DateTime?
  completedAt  DateTime?
  quizScore    Int?
  timeSpentSec Int       @default(0)
  @@unique([assignmentId, dayId])
}

model Quiz {
  id        String         @id @default(cuid())
  dayId     String         @unique
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
}

enum OnboardingStatus { IN_PROGRESS COMPLETED OVERDUE }
enum QuizType         { MCQ TRUE_FALSE SHORT_ANSWER }
```

### 2.3 Knowledge Base + RAG

```prisma
model Document {
  id           String          @id @default(cuid())
  tenantId     String
  title        String
  filename     String
  mimeType     String
  storageKey   String
  lang         Lang
  version      Int             @default(1)
  status       DocStatus       @default(PROCESSING)
  category     String?
  visibility   String[]
  uploadedById String
  chunkCount   Int             @default(0)
  pages        Int?
  createdAt    DateTime        @default(now())
  chunks       DocumentChunk[]
}

model DocumentChunk {
  id         String                       @id @default(cuid())
  tenantId   String
  documentId String
  chunkIndex Int
  text       String
  page       Int?
  section    String?
  tokenCount Int
  embedding  Unsupported("vector(1536)")
  tsv        Unsupported("tsvector")
  @@index([tenantId])
  @@index([documentId])
}

model Conversation {
  id         String      @id @default(cuid())
  tenantId   String
  userId     String
  source     ConvSource
  contextRef String?
  title      String?
  createdAt  DateTime    @default(now())
  messages   Message[]
}

model Message {
  id             String     @id @default(cuid())
  conversationId String
  role           MsgRole
  content        String
  lang           Lang?
  rating         Int?
  noAnswerFlag   Boolean    @default(false)
  citations      Citation[]
  createdAt      DateTime   @default(now())
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
}

model NextStepSuggestion {
  id        String         @id @default(cuid())
  messageId String         @unique
  kind      SuggestionKind
  refId     String
  label     String
}

enum DocStatus      { PROCESSING READY FAILED OUTDATED }
enum ConvSource     { KB ONBOARDING_COMPANION MEMORY_PERSONA }
enum MsgRole        { USER ASSISTANT SYSTEM }
enum SuggestionKind { KB_READ SIMULATOR ONBOARDING PERSONA_ASK }
```

### 2.4 Simulator

```prisma
model Scenario {
  id          String              @id @default(cuid())
  tenantId    String
  category    String
  title       String
  brief       String
  personaDesc String
  difficulty  Difficulty
  lang        Lang
  active      Boolean             @default(true)
  criteria    ScenarioCriterion[]
}

model ScenarioCriterion {
  id         String  @id @default(cuid())
  scenarioId String
  dimension  String
  weight     Float   @default(1.0)
  rubric     String
}

model SimulatorSession {
  id         String           @id @default(cuid())
  tenantId   String
  userId     String
  scenarioId String
  attemptNum Int              @default(1)
  status     SessionStatus
  startedAt  DateTime         @default(now())
  endedAt    DateTime?
  turns      SimulatorTurn[]
  score      SimulatorScore?
}

model SimulatorTurn {
  id        String   @id @default(cuid())
  sessionId String
  turnIndex Int
  speaker   Speaker
  text      String
  createdAt DateTime @default(now())
}

model SimulatorScore {
  id              String   @id @default(cuid())
  sessionId       String   @unique
  overall         Int
  dimensionScores Json
  feedback        Json
  weakAreas       Json
  createdAt       DateTime @default(now())
}

enum Difficulty    { BASIC INTERMEDIATE ADVANCED }
enum SessionStatus { IN_PROGRESS COMPLETED ABANDONED }
enum Speaker       { EMPLOYEE AI_PERSONA }
```

### 2.5 Employee Knowledge Memory

```prisma
model Project {
  id          String          @id @default(cuid())
  tenantId    String
  name        String
  department  String?
  description String?
  status      String
  members     ProjectMember[]
  notes       KnowledgeNote[]
}

model ProjectMember {
  id        String @id @default(cuid())
  projectId String
  userId    String
  role      String
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
  visibility NoteVisibility
  tags       String[]
  createdAt  DateTime       @default(now())
}

model Persona {
  id             String         @id @default(cuid())
  tenantId       String
  userId         String         @unique
  voiceProfile   String
  expertiseTags  String[]
  expertiseScore Json
  lastTrainedAt  DateTime?
  chunks         PersonaChunk[]
}

model PersonaChunk {
  id          String                       @id @default(cuid())
  tenantId    String
  personaId   String
  source      PersonaSource
  sourceRefId String
  text        String
  tokenCount  Int
  embedding   Unsupported("vector(1536)")
  createdAt   DateTime                     @default(now())
  @@index([personaId])
  @@index([tenantId])
}

model OffboardingInterview {
  id          String           @id @default(cuid())
  tenantId    String
  userId      String
  triggeredBy String
  status      InterviewStatus
  startedAt   DateTime?
  completedAt DateTime?
  questions   OffboardingQA[]
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
}

enum NoteKind        { PROJECT_REFLECTION DECISION PROCESS LESSON }
enum NoteVisibility  { PRIVATE TEAM ALL }
enum PersonaSource   { NOTE OFFBOARDING_ANSWER KB_ANSWER SIM_TRANSCRIPT }
enum InterviewStatus { SCHEDULED IN_PROGRESS COMPLETED }
```

### 2.6 Supporting

```prisma
model PointsEvent {
  id        String   @id @default(cuid())
  tenantId  String
  userId    String
  reason    String
  points    Int
  metadata  Json?
  createdAt DateTime @default(now())
}

model Badge {
  id        String   @id @default(cuid())
  tenantId  String
  userId    String
  code      String
  awardedAt DateTime @default(now())
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
}

model AnalyticsEvent {
  id        String   @id @default(cuid())
  tenantId  String
  userId    String?
  event     String
  payload   Json
  createdAt DateTime @default(now())
  @@index([tenantId, event, createdAt])
}
```

### 2.7 pgvector setup (hand-written migration)

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE "DocumentChunk"
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS tsv tsvector
    GENERATED ALWAYS AS (to_tsvector('simple', coalesce(text,''))) STORED;

CREATE INDEX IF NOT EXISTS dc_embedding_ivfflat
  ON "DocumentChunk" USING ivfflat (embedding vector_cosine_ops) WITH (lists=100);
CREATE INDEX IF NOT EXISTS dc_tsv_gin ON "DocumentChunk" USING gin (tsv);
CREATE INDEX IF NOT EXISTS dc_tenant_doc ON "DocumentChunk" ("tenantId","documentId");

CREATE INDEX IF NOT EXISTS pc_embedding_ivfflat
  ON "PersonaChunk" USING ivfflat (embedding vector_cosine_ops) WITH (lists=100);
CREATE INDEX IF NOT EXISTS pc_tenant_persona ON "PersonaChunk" ("tenantId","personaId");
```

---

## 3. AI orchestration

### 3.1 Module layout (`apps/api/src/ai/`)

```
ai/
├── openai.client.ts           # SDK singleton + retry + telemetry
├── ai.module.ts               # Global
├── ai.service.ts              # Facade
├── embeddings/
│   ├── embeddings.service.ts
│   └── chunker.ts
├── rag/
│   ├── rag.service.ts
│   ├── vector-search.ts
│   ├── keyword-search.ts
│   ├── fusion.ts
│   └── reranker.ts
├── chat/
│   ├── chat-stream.service.ts
│   └── message-store.ts
├── scoring/
│   ├── scoring.service.ts
│   └── score-schema.ts
├── persona/
│   ├── persona-rag.service.ts
│   └── persona-train.service.ts
├── prompts/
│   ├── kb-answer.prompt.ts
│   ├── onboarding-companion.prompt.ts
│   ├── simulator-roleplay.prompt.ts
│   ├── simulator-score.prompt.ts
│   ├── persona-voice.prompt.ts
│   ├── offboarding-interviewer.prompt.ts
│   ├── next-step.prompt.ts
│   └── shared/language-policy.ts
├── voice/
│   └── stt.service.ts
└── guardrails/
    ├── input-redactor.ts
    └── output-validator.ts
```

### 3.2 Model selection policy

| Use case | Model |
|---|---|
| KB chat streaming | `gpt-4o-mini` |
| Onboarding companion | `gpt-4o-mini` |
| Simulator roleplay turn | `gpt-4o-mini` |
| Simulator scoring (final) | `gpt-4o` |
| Persona answer | `gpt-4o-mini` |
| Offboarding interviewer | `gpt-4o` |
| Next-step suggestion | `gpt-4o-mini` |
| Embeddings | `text-embedding-3-small` |
| STT | `whisper-1` |

All model names come from env vars (`OPENAI_MODEL_*`).

### 3.3 Language policy (shared prefix in every system prompt)

```
LANGUAGE POLICY:
- Detect the user's language from their input (uz, ru, en).
- Always respond in the SAME language as the user's last message.
- If quoting a document in a different language, translate the quote and
  show the original in parentheses.
- Localize currency (UZS / so'm), dates, and numerals.
```

### 3.4 Hybrid RAG pipeline (KB)

```
[question] → [embed] ──┐                    ┌── [tsvector keyword]
                       ↓                    ↓
              [pgvector top-20]      [tsvector top-20]
                       └──────┬─────────────┘
                              ▼
                   [Reciprocal Rank Fusion, k=60]
                              ▼
                  [visibility/role filter, top-5]
                              ▼
                  [PromptBuilder.kbAnswer]
                              ▼
                  [gpt-4o-mini stream → SSE]
                              ▼
              [parse citations JSON → persist Message+Citations]
                              ▼
                  [parallel: next-step suggestion]
```

**Vector SQL:**
```sql
SELECT id, "documentId", text, page, section,
       1 - (embedding <=> $1::vector) AS score
FROM "DocumentChunk"
WHERE "tenantId" = $2
ORDER BY embedding <=> $1::vector
LIMIT 20;
```

**Keyword SQL:**
```sql
SELECT id, "documentId", text, page, section,
       ts_rank(tsv, plainto_tsquery('simple', $1)) AS score
FROM "DocumentChunk"
WHERE "tenantId" = $2
  AND tsv @@ plainto_tsquery('simple', $1)
ORDER BY score DESC
LIMIT 20;
```

**RRF:** `score(doc) = Σ 1 / (k + rank_i(doc))` with k=60, merging vector and keyword.

### 3.5 Chunking

- Boundary-aware: respect paragraph boundaries; fall back to sentences
- Target ~500 tokens, overlap ~80 tokens (~16%)
- Preserve nearest heading (H1/H2) as chunk header
- PDF: `pdf-parse` + page tracking; DOCX: `mammoth`
- Background BullMQ job `documents.ingest`: extract → chunk → embed in batches of 32 → insert

### 3.6 KB answer prompt (skeleton)

```
SYSTEM:
You are CorpMind, an AI assistant for {{tenantName}}. Answer employee
questions strictly using the provided document snippets. If the snippets
do not contain the answer, say so honestly and recommend who to ask.

{{LANGUAGE_POLICY}}

CITATION RULES:
- After every factual statement, insert a marker like [^1], [^2]
  referring to the snippet index.
- At the end, emit a JSON block:
  ```json
  { "citations": [{ "marker": 1, "chunkId": "..." }, ...] }
  ```
- If no snippet supports a claim, do not make the claim.

CONVERSATION HISTORY:
{{last 6 messages, truncated}}

RETRIEVED SNIPPETS:
[1] (doc: "...", page: N, lang: ..)
{{text}}
...

USER QUESTION:
{{question}}
```

Output JSON validated with Zod; on parse failure, retry once.

### 3.7 Onboarding companion prompt

Variant of KB prompt with extra context:
- `currentOnboardingDay`, `currentTopic`
- Snippets restricted to documents linked from this day's topics
- Mentor-like tone, optional comprehension check ("Bitta savol berib ko'raymi?")

### 3.8 Simulator roleplay prompt

```
SYSTEM:
You ROLEPLAY as a character. You are NOT an AI assistant.

CHARACTER PROFILE:
{{scenario.personaDesc}}

SETTING:
{{scenario.brief}}

RULES:
- Stay strictly in character. Never break the fourth wall.
- React naturally to tone. Escalate if dismissed, de-escalate if heard.
- Difficulty: BASIC=cooperative, INTERMEDIATE=mild resistance,
  ADVANCED=frustrated, edge cases, time pressure.
- 1–3 sentences typically.
- Language: same as the employee's first message.

CONVERSATION SO FAR:
{{turns}}

EMPLOYEE'S LATEST:
{{userText}}
```

### 3.9 Simulator scoring schema

```ts
const ScoreSchema = z.object({
  overall: z.number().min(0).max(100),
  dimensions: z.object({
    correctness: z.number().min(0).max(100),
    tone: z.number().min(0).max(100),
    processAdherence: z.number().min(0).max(100),
    resolution: z.number().min(0).max(100),
    compliance: z.number().min(0).max(100),
  }),
  feedback: z.array(z.object({
    dimension: z.string(),
    comment: z.string(),
    quote: z.string().optional(),
    severity: z.enum(['praise', 'minor', 'major']),
  })),
  weakAreas: z.array(z.object({
    topic: z.string(),
    suggestKbQuery: z.string().optional(),
    suggestPersonaTags: z.array(z.string()),
  })),
});
```

Rubrics injected dynamically from `ScenarioCriterion.rubric`. After scoring, **Knowledge Bridge** maps `weakAreas` → KB search + persona tag match → suggestions surfaced in UI.

### 3.10 Persona RAG

Mirrors KB RAG, but:
- Vector index: `PersonaChunk` filtered to the persona
- System prompt is first-person ("Men Aziz Karimov... Bu javob mening yozuvlarimdan olingan")
- Confidence: if top similarity < 0.55, respond "Bu haqida menda yetarli ma'lumot yo'q, [manager]'ga murojaat qiling"
- Every answer cites the source note/interview/turn

**Indexing job:** new KnowledgeNote, OffboardingAnswer, or high-scoring SimulatorTurn → enqueue → embed → insert `PersonaChunk`.

**Expertise heuristic (MVP):**
```
score(tag) = 0.4 * notesCount_norm
           + 0.3 * kbAnswersAuthored_norm
           + 0.2 * avgSimScore_norm
           + 0.1 * documentsAuthored_norm
```
Tags extracted from text via TF-IDF + small fixed taxonomy (`natural` library, no LLM call).

### 3.11 Offboarding interviewer

- Trigger: admin sets `User.status = DEPARTING` → create `OffboardingInterview`
- AI generates 15–20 questions tailored to role and recorded projects
- Per question: text input or audio (Whisper → transcript)
- On completion: answers embedded into `PersonaChunk`, persona becomes "live"
- Designed for 2–3 sessions, ~20 minutes each, with auto-save

### 3.12 SSE pattern (NestJS)

```ts
@Sse('ask')
@UseGuards(JwtGuard, TenantGuard)
ask(@Body() dto: AskDto, @CurrentUser() u: User): Observable<MessageEvent> {
  return this.kb.askStream(dto, u).pipe(
    map(token => ({ data: token, type: 'token' })),
  );
}
```

Client uses `EventSource` with cookie auth.

### 3.13 Guardrails

- **Input redactor:** regex-strip card numbers, JSHSHIR, IBAN before LLM
- **Output validator:** Zod parse + one retry, fallback minimal response
- **Rate limit:** Nest throttler per user (60 req/min, 30 LLM/min)
- **Cost guard:** per-call telemetry + daily budget kill switch (env var)
- **Prompt injection:** retrieved chunks wrapped in `<<USER_CONTENT>> ... <<END>>` and labeled untrusted

### 3.14 Caching

- Embedding cache: query hash → embedding in Redis (TTL 1h)
- Chunk text cache: `chunk:{id}` → text in Redis
- KB response cache: normalized query + visibility hash → answer (short TTL)

---

## 4. APIs, routes, demo flow

### 4.1 REST endpoints (selected)

All under `/api/v1`. Pagination `?page=&pageSize=`. Errors: ProblemDetails JSON.

**Auth & Foundation**
```
POST   /auth/login | /auth/refresh | /auth/logout
GET    /auth/me                          PATCH /auth/me/lang
GET    /tenants/me
GET    /users  POST /users  PATCH /users/:id  PATCH /users/:id/status
POST   /users/bulk-import
```

**Module 1 — Onboarding**
```
GET    /onboarding/templates            POST /onboarding/templates
GET    /onboarding/templates/:id        POST /onboarding/templates/:id/days
PATCH  /onboarding/days/:id             POST /onboarding/days/:id/topics
POST   /onboarding/days/:id/quiz
POST   /onboarding/assignments
GET    /me/onboarding
POST   /me/onboarding/days/:dayId/start
POST   /me/onboarding/days/:dayId/complete
POST   /me/onboarding/companion/ask     (SSE)
```

**Module 2 — KB**
```
GET    /documents  POST /documents  GET /documents/:id  DELETE /documents/:id
POST   /documents/:id/reprocess
POST   /kb/ask                          (SSE)
GET    /kb/conversations  GET /kb/conversations/:id/messages
POST   /kb/messages/:id/rate
GET    /kb/faq/top  GET /kb/faq/unanswered
```

**Module 3 — Simulator**
```
GET    /scenarios  GET /scenarios/:id
POST   /scenarios  PATCH /scenarios/:id
POST   /simulator/sessions              (SSE intro)
POST   /simulator/sessions/:id/turn     (SSE turn)
POST   /simulator/sessions/:id/end
GET    /simulator/sessions/:id  GET /simulator/sessions/:id/score
GET    /me/simulator/history
```

**Module 4 — Memory**
```
GET    /projects  POST /projects  GET /projects/:id  POST /projects/:id/members
GET    /me/notes  POST /notes  PATCH /notes/:id  DELETE /notes/:id
GET    /personas  GET /personas/:id
POST   /personas/:id/ask                (SSE)
GET    /who-knows
POST   /offboarding/interviews  GET /me/offboarding/interview
POST   /offboarding/interviews/:id/start
POST   /offboarding/interviews/:id/qa/:qaId/answer
POST   /offboarding/interviews/:id/audio
POST   /offboarding/interviews/:id/complete
```

**Dashboard / Analytics**
```
GET    /dashboard/team-overview
GET    /dashboard/skill-gap
GET    /dashboard/knowledge-risk
GET    /dashboard/most-asked
GET    /dashboard/employee/:id
GET    /admin/analytics/overview  GET /admin/analytics/documents
```

**Gamification & Notifications**
```
GET    /me/points  GET /me/badges  GET /leaderboard
GET    /me/notifications  POST /me/notifications/:id/read
POST   /me/notifications/mark-all-read
```

### 4.2 Frontend route map

```
Public:    /login, /forgot-password
Employee:  /, /home, /onboarding, /onboarding/history,
           /kb, /kb/c/:id,
           /simulator, /simulator/:id, /simulator/session/:id,
           /simulator/session/:id/score,
           /memory, /memory/projects, /memory/projects/:id,
           /memory/personas/:id, /memory/who-knows,
           /memory/offboarding (if assigned), /profile, /notifications
Manager:   /team, /team/employee/:id, /team/reports
Admin:     /admin, /admin/users[, /new, /:id],
           /admin/documents[, /new], /admin/scenarios[, /new],
           /admin/onboarding[, /templates/:id],
           /admin/projects, /admin/offboarding,
           /admin/settings, /admin/analytics
```

**Shells:** `EmployeeShell`, `ManagerShell`, `AdminShell`. All include lang switcher, points pill, badges, notifications bell.

**Anchor components:** `ChatStream`, `RadarChart` (recharts), `PersonaCard`, `DocumentUploadDropzone`, `OnboardingDayCard`, `LangSwitcher`, `QuizRunner`, `SourceCitation`.

### 4.3 Demo flow (5-minute pitch)

**Pre-seed:** SQB tenant; 5 users (Aziz Karimov departing, Malika manager, Bekzod new hire, Nigora HR admin, +1 employee); 6–8 documents; "Credit Officer 5-day" onboarding template (Bekzod assigned); 3 scenarios (Urgent Client, Suspicious Transaction, Confused Retiree); Aziz persona with 3 notes + 8 offboarding QAs + 20 KB answers; 12 pre-seeded simulator sessions for manager dashboard history.

**Scene 1 — Day 1 onboarding (60s):** Bekzod logs in → `/onboarding` → companion grounded answer → 3-question quiz → Day 2 unlock animation + points.

**Scene 2 — KB (60s):** "Yuridik shaxs uchun kredit foiz stavkalari qanday?" → streaming answer with 2 citations → next-step suggestion to checklist or simulator.

**Scene 3 — Simulator (90s):** "The Urgent Client" → 3–4 turns of roleplay → end → radar chart with 5 dimensions + feedback quotes + Knowledge Bridge ("AML manual section 3" + "Ask Aziz").

**Scene 4 — Memory / Aziz persona (60s):** `/memory/personas/aziz` → "Erta to'lash holatlarini qanday boshqaryapsiz?" → first-person streaming answer + source note link + confidence indicator. Voice input shown.

**Scene 5 — Manager dashboard (45s):** Login as Malika → `/team` (status colors) → `/team/reports` (skill gap alert, most-asked, unanswered, knowledge risk on Aziz's pending offboarding).

**Scene 6 — Admin generic-platform proof (30s):** Login as Nigora → `/admin/documents` (upload demo) → `/admin/settings` (industry switch).

**Closing line:** "Aziz Karimov 3 oy oldin Toshkentga ko'chgan. Lekin uning tajribasi u bilan ketmadi. U shu yerda yashayapti."

---

## 5. Dev infrastructure

### 5.1 Monorepo layout

```
corporate-edu/
├── package.json                 # workspace root
├── pnpm-workspace.yaml
├── .nvmrc                       # 20.18
├── .env.example
├── docker-compose.yml           # postgres (pgvector) + redis
├── docs/
│   ├── superpowers/specs/
│   └── seed-docs/               # SQB demo PDF/DOCX
├── packages/shared/             # enums, zod schemas, DTO types, i18n keys
└── apps/
    ├── api/                     # NestJS (strict TS)
    │   ├── prisma/{schema.prisma, migrations/, seed.ts}
    │   ├── storage/             # uploads (.gitignored)
    │   └── src/{common, config, prisma, auth, tenants, users,
    │            onboarding, kb, documents, simulator, scenarios,
    │            memory, dashboard, gamification, notifications,
    │            i18n, ai, queue, storage}
    └── web/                     # React + Vite
        └── src/{lib, i18n, components/{ui, shell, feature},
                 features/{auth, onboarding, kb, simulator, memory,
                           dashboard, admin, gamification}, pages}
```

### 5.2 Root scripts

```json
{
  "scripts": {
    "dev": "pnpm -r --parallel run dev",
    "dev:api": "pnpm --filter @corpmind/api dev",
    "dev:web": "pnpm --filter @corpmind/web dev",
    "build": "pnpm -r run build",
    "lint": "pnpm -r run lint",
    "typecheck": "pnpm -r run typecheck",
    "test": "pnpm -r run test",
    "db:up": "docker compose up -d postgres redis",
    "db:migrate": "pnpm --filter @corpmind/api prisma migrate dev",
    "db:seed": "pnpm --filter @corpmind/api prisma db seed",
    "db:reset": "pnpm --filter @corpmind/api prisma migrate reset --force",
    "demo:bootstrap": "pnpm db:up && pnpm db:migrate && pnpm db:seed",
    "ingest:demo-docs": "pnpm --filter @corpmind/api run ingest:demo"
  }
}
```

### 5.3 Docker Compose (`docker-compose.yml`)

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: corpmind
      POSTGRES_PASSWORD: corpmind
      POSTGRES_DB: corpmind
    volumes: [corpmind_pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "corpmind"]
      interval: 5s
      retries: 10
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes: [corpmind_redisdata:/data]
volumes:
  corpmind_pgdata:
  corpmind_redisdata:
```

### 5.4 `.env.example`

```
# API
NODE_ENV=development
API_PORT=4000
API_BASE_URL=http://localhost:4000
WEB_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://corpmind:corpmind@localhost:5432/corpmind
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=change-me
JWT_REFRESH_SECRET=change-me-too
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d

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

Validated at boot via Zod (`apps/api/src/config/env.ts`); invalid → fail fast.

### 5.5 NestJS bootstrap

- `helmet`, `compression`, `cookieParser`
- `app.enableCors({ origin: env.WEB_ORIGIN, credentials: true })`
- Global `ValidationPipe({ whitelist: true, transform: true })`
- Global `HttpExceptionFilter` → ProblemDetails JSON
- Global `LoggingInterceptor` with request id
- Swagger UI (`/api/docs`) in dev
- BullMQ board (`/admin/queues`) in dev
- `ThrottlerModule` (60/min IP, 30 LLM/min user)

### 5.6 Frontend bootstrap

- `QueryClientProvider` (staleTime 60s, retry 1)
- `BrowserRouter` + `RouterProvider`
- `I18nextProvider` (lazy load uz/ru/en namespaces)
- shadcn `ThemeProvider`
- `Toaster` (sonner)
- Axios interceptor: 401 → refresh → retry → on failure clear + redirect

### 5.7 Testing

| Layer | Tool |
|---|---|
| API unit | Jest + ts-jest (chunker, fusion, score parser) |
| API integration | Jest + Testcontainers postgres+pgvector |
| API e2e | Jest + supertest (login, ask, full sim session) |
| Web unit | Vitest + React Testing Library |
| Web e2e smoke | Playwright golden path |

OpenAI calls in tests use recorded fixtures (`nock`), never real network.

### 5.8 Observability

- `pino` JSON logs, dev `pino-pretty`
- request id middleware
- AI telemetry: `{ model, promptTokens, completionTokens, latencyMs, cost }` + Redis daily sum
- BullMQ dashboard at `/admin/queues`
- `GET /health` returns `{ status, postgres, redis, openai }`

### 5.9 Code quality

- TS `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`
- ESLint: `@typescript-eslint/strict`, `import`, `react-hooks`
- Prettier: 100 col, single quotes, all trailing commas
- Optional Husky + lint-staged
- Path aliases: API/Web `@/...`, shared `@corpmind/shared`

### 5.10 Seed pipeline (`apps/api/prisma/seed.ts`)

Idempotent. Creates: SQB tenant + branding; 5 users; Credit Officer 5-day template + days/topics/quizzes; projects + memberships; 3 scenarios + criteria; 12 pre-seeded simulator sessions; Aziz persona content (3 notes + offboarding interview with 8 QAs + 20 KB messages); persona expertise scoring triggered. Document ingest is a separate one-off script (`pnpm ingest:demo-docs`) that enqueues BullMQ jobs to chunk and embed seed PDFs from `docs/seed-docs/`.

### 5.11 Demo readiness checklist

- [ ] `pnpm demo:bootstrap` succeeds
- [ ] `pnpm ingest:demo-docs` completes; all docs `READY`
- [ ] Login works for 4 users
- [ ] Bekzod Day 1 → quiz pass → Day 2 unlock
- [ ] KB question yields 2+ citations
- [ ] "Urgent Client" full session → 5-dimension score
- [ ] Aziz persona answers first-person with citation + confidence
- [ ] Manager dashboard shows status colors
- [ ] Voice input via Whisper tested
- [ ] Lang switcher uz↔ru works
- [ ] Admin settings shows industry switch
- [ ] OpenAI daily budget below 50% headroom
- [ ] SSE streaming tested under network throttle

---

## 6. Explicitly out of scope (this MVP)

- Production cloud deployment (kept for post-hackathon)
- Mobile native apps
- Slack/Teams integration
- Video content support
- AI-generated onboarding content from raw docs
- Document version-control UI beyond a simple "outdated" flag
- Auto-generated project wikis (notes display only; auto-summary later)
- Advanced reranker (cross-encoder)
- Query rewriting in RAG
- 360-degree feedback integration
- HRIS API integration (BambooHR, Workday)
- Predictive analytics ("likely to leave")
- Knowledge graph visualization
- Multi-language beyond uz/ru/en
- Fine-tuning per persona

---

## 7. Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| 24h timeline overrun | High | Aggressive parallelization via Codex; nightly checkpoint with seed-only working demo as fallback |
| OpenAI rate limit / outage during demo | Medium | Cache demo path responses; pre-record fallback transcripts |
| pgvector ivfflat poor recall on small corpus | Medium | Lists=100 acceptable for 6–8 docs; fallback to brute-force `<->` if needed |
| SSE breakage behind dev proxies | Low | Vite dev proxy passes through SSE; verified |
| Whisper Uzbek quality | Medium | Voice input flagged as bonus; transcript editable before save |
| Prompt injection from uploaded docs | Medium | `<<USER_CONTENT>>` wrapping + system-prompt isolation |

---

## 8. Implementation roadmap (high-level)

Detailed plan to be produced by the `writing-plans` skill next. Sequencing:

1. **Foundation:** monorepo + Docker + Prisma schema + auth + tenant guard + base shell
2. **Documents + RAG core:** upload + ingest pipeline + hybrid search service
3. **KB Assistant:** ask endpoint (SSE) + chat UI + citations + next-step
4. **Onboarding:** templates + assignments + companion (reuses RAG) + quizzes
5. **Simulator:** scenarios + session + roleplay turn + scoring + knowledge bridge UI
6. **Memory:** notes + persona index + persona ask + offboarding + who-knows
7. **Dashboard:** team overview + reports + analytics
8. **Gamification + notifications + voice input**
9. **i18n + polish + branding + seed data + demo dry-runs**

Each phase ships behind a working demo of the prior phase. The Claude-orchestrator dispatches each phase to Codex CLI and verifies output before advancing.
