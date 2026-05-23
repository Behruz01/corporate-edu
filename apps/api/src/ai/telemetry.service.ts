import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import IORedis from 'ioredis';
import { loadEnv } from '../config/env';

type TelemetryEntry = {
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
};

const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'text-embedding-3-small': { input: 0.02, output: 0 },
};

@Injectable()
export class TelemetryService implements OnModuleDestroy {
  private readonly logger = new Logger(TelemetryService.name);
  private readonly redis: IORedis;
  private readonly dailyBudgetUsd: number;

  constructor() {
    const env = loadEnv();
    this.redis = new IORedis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
    this.dailyBudgetUsd = env.OPENAI_DAILY_BUDGET_USD;
  }

  async record(entry: TelemetryEntry): Promise<{ costUsd: number; dailyUsd: number }> {
    const pricing = PRICING[entry.model] ?? { input: 0, output: 0 };
    const costUsd = (entry.promptTokens * pricing.input + entry.completionTokens * pricing.output) / 1_000_000;
    const key = `ai:cost:${new Date().toISOString().slice(0, 10)}`;

    if (this.redis.status !== 'ready') await this.redis.connect().catch(() => undefined);
    const total = await this.redis.incrbyfloat(key, costUsd);
    await this.redis.expire(key, 60 * 60 * 36);

    const dailyUsd = Number(total);
    this.logger.log(
      `${entry.model} ${entry.promptTokens}p+${entry.completionTokens}c ${entry.latencyMs}ms ` +
        `$${costUsd.toFixed(4)} (day $${dailyUsd.toFixed(2)})`,
    );

    if (dailyUsd > this.dailyBudgetUsd) {
      throw new Error(`OpenAI daily budget exceeded ($${dailyUsd.toFixed(2)} > $${this.dailyBudgetUsd})`);
    }
    return { costUsd, dailyUsd };
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit().catch(() => undefined);
  }
}
