import { Prisma, PrismaClient, type PersonaSource } from '@prisma/client';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { OpenAiClient } from '../ai/openai.client';
import { EmbeddingsService } from '../ai/embeddings/embeddings.service';
import { TelemetryService } from '../ai/telemetry.service';
import { IngestWorker } from '../documents/ingest.worker';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { estimateTokens, vectorLiteral } from '../memory/memory.util';

const TENANT_SLUG = process.env.DEMO_TENANT_SLUG ?? 'sqb';
const UPLOADER_EMAIL = 'nigora@sqb.uz';
const PERSONA_EMAIL = 'aziz@sqb.uz';
const REPO_ROOT = path.resolve(__dirname, '../../../..');
const SEED_DOCS_DIR = path.join(REPO_ROOT, 'docs/seed-docs');

type PersonaIndexItem = {
  source: PersonaSource;
  sourceRefId: string;
  text: string;
};

async function main(): Promise<void> {
  await loadDotEnvFiles();
  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.log(
      'ingest-demo-docs: OPENAI_API_KEY is not set; skipping document and persona embedding.',
    );
    return;
  }
  applyScriptEnvDefaults();

  const prisma = new PrismaService();
  const telemetry = new TelemetryService();
  const embeddings = new EmbeddingsService(new OpenAiClient(), telemetry);
  const storage = new StorageService();
  const ingestWorker = new IngestWorker(prisma, storage, embeddings);

  try {
    await prisma.$connect();
    const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } });
    if (!tenant) throw new Error(`Tenant not found: ${TENANT_SLUG}. Run seed first.`);

    const uploader = await prisma.user.findFirst({
      where: { tenantId: tenant.id, email: UPLOADER_EMAIL },
      select: { id: true },
    });
    if (!uploader) throw new Error(`Uploader not found: ${UPLOADER_EMAIL}. Run seed first.`);

    const documents = await ingestSeedDocuments({
      prisma,
      storage,
      ingestWorker,
      tenantId: tenant.id,
      uploaderId: uploader.id,
    });
    const personaChunks = await indexAzizPersona({ prisma, embeddings, tenantId: tenant.id });

    console.log(
      `ingest-demo-docs: ingested ${documents} documents and indexed ${personaChunks} persona chunks.`,
    );
  } finally {
    await embeddings.onModuleDestroy();
    await telemetry.onModuleDestroy();
    await prisma.$disconnect();
  }
}

async function ingestSeedDocuments(input: {
  prisma: PrismaService;
  storage: StorageService;
  ingestWorker: IngestWorker;
  tenantId: string;
  uploaderId: string;
}): Promise<number> {
  const entries = await fs.readdir(SEED_DOCS_DIR, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  await input.storage.ensureRoot();
  for (const filename of files) {
    const abs = path.join(SEED_DOCS_DIR, filename);
    const buffer = await fs.readFile(abs);
    const id = `${input.tenantId}-seed-doc-${slugFromFilename(filename)}`;
    const storageKey = path.posix.join('seed-docs', input.tenantId, filename);
    const storageAbs = input.storage.absolute(storageKey);
    await fs.mkdir(path.dirname(storageAbs), { recursive: true });
    await fs.writeFile(storageAbs, buffer);

    const document = await input.prisma.document.upsert({
      where: { id },
      update: {
        title: titleFromFilename(filename),
        filename,
        mimeType: mimeTypeFor(filename),
        storageKey,
        lang: 'UZ',
        category: 'sqb-demo',
        visibility: ['team', 'onboarding', 'simulator'],
        uploadedById: input.uploaderId,
        status: 'PROCESSING',
        chunkCount: 0,
        pages: null,
      },
      create: {
        id,
        tenantId: input.tenantId,
        title: titleFromFilename(filename),
        filename,
        mimeType: mimeTypeFor(filename),
        storageKey,
        lang: 'UZ',
        category: 'sqb-demo',
        visibility: ['team', 'onboarding', 'simulator'],
        uploadedById: input.uploaderId,
        status: 'PROCESSING',
      },
    });

    await input.ingestWorker.process(
      { documentId: document.id, tenantId: input.tenantId },
      `seed-doc:${filename}`,
    );
  }

  return files.length;
}

async function indexAzizPersona(input: {
  prisma: PrismaClient;
  embeddings: EmbeddingsService;
  tenantId: string;
}): Promise<number> {
  const persona = await input.prisma.persona.findFirst({
    where: { tenantId: input.tenantId, user: { email: PERSONA_EMAIL } },
    select: { id: true },
  });
  if (!persona) throw new Error(`Persona not found for ${PERSONA_EMAIL}. Run seed:demo first.`);

  const notes = await input.prisma.knowledgeNote.findMany({
    where: { tenantId: input.tenantId, author: { email: PERSONA_EMAIL } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, prompt: true, text: true },
  });
  const interviews = await input.prisma.offboardingInterview.findMany({
    where: { tenantId: input.tenantId, user: { email: PERSONA_EMAIL } },
    select: {
      questions: {
        orderBy: { order: 'asc' },
        select: { id: true, questionText: true, answerText: true },
      },
    },
  });

  const items: PersonaIndexItem[] = [
    ...notes.map((note) => ({
      source: 'NOTE' as const,
      sourceRefId: note.id,
      text: note.prompt ? `Savol: ${note.prompt}\n\nJavob: ${note.text}` : note.text,
    })),
    ...interviews.flatMap((interview) =>
      interview.questions
        .filter((qa) => qa.answerText?.trim())
        .map((qa) => ({
          source: 'OFFBOARDING_ANSWER' as const,
          sourceRefId: qa.id,
          text: `Savol: ${qa.questionText}\n\nJavob: ${qa.answerText ?? ''}`,
        })),
    ),
  ];

  if (items.length === 0) return 0;
  const vectors = await input.embeddings.embedBatch(items.map((item) => item.text));

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const embedding = vectors[index];
    if (!item || !embedding) throw new Error(`Missing persona item or embedding at index ${index}`);
    await input.prisma.$executeRaw`
      DELETE FROM "PersonaChunk"
      WHERE "tenantId" = ${input.tenantId}
        AND source = ${item.source}::"PersonaSource"
        AND "sourceRefId" = ${item.sourceRefId}
    `;
    await input.prisma.$executeRaw`
      INSERT INTO "PersonaChunk"
        (id, "tenantId", "personaId", source, "sourceRefId", text, "tokenCount", embedding, "createdAt")
      VALUES
        (${randomUUID()}, ${input.tenantId}, ${persona.id}, ${item.source}::"PersonaSource",
         ${item.sourceRefId}, ${item.text}, ${estimateTokens(item.text)}, ${vectorLiteral(embedding)}::vector, NOW())
    `;
  }

  await input.prisma.persona.update({
    where: { id: persona.id },
    data: { lastTrainedAt: new Date() },
  });
  return items.length;
}

async function loadDotEnvFiles(): Promise<void> {
  for (const file of [path.join(REPO_ROOT, '.env'), path.join(REPO_ROOT, 'apps/api/.env')]) {
    let content: string;
    try {
      content = await fs.readFile(file, 'utf8');
    } catch {
      continue;
    }
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
      if (!match) continue;
      const key = match[1];
      const rawValue = match[2];
      if (!key || rawValue === undefined) continue;
      const value = stripEnvQuotes(rawValue);
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

function applyScriptEnvDefaults(): void {
  process.env.API_BASE_URL ??= 'http://localhost:4000';
  process.env.WEB_ORIGIN ??= 'http://localhost:5173';
  process.env.REDIS_URL ??= 'redis://localhost:6379';
  process.env.JWT_ACCESS_SECRET ??= 'demo-jwt-access-secret-with-32-characters';
  process.env.JWT_REFRESH_SECRET ??= 'demo-jwt-refresh-secret-with-32-characters';
  process.env.STORAGE_PUBLIC_URL ??= 'http://localhost:4000/files';
  process.env.STORAGE_LOCAL_DIR ??= './storage';
}

function stripEnvQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '');
  return base
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function slugFromFilename(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function mimeTypeFor(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.md') return 'text/markdown';
  if (ext === '.txt') return 'text/plain';
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.docx')
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return 'application/octet-stream';
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
