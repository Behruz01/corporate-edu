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

  OPENAI_API_KEY: z.string().optional(),
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
