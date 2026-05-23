import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import IORedis from 'ioredis';
import { createHash } from 'node:crypto';
import { OpenAiClient } from '../openai.client';
import { TelemetryService } from '../telemetry.service';
import { loadEnv } from '../../config/env';

const BATCH_SIZE = 32;
const CACHE_TTL_SEC = 60 * 60;

@Injectable()
export class EmbeddingsService implements OnModuleDestroy {
  private readonly redis: IORedis;
  private readonly model: string;

  constructor(
    private readonly openai: OpenAiClient,
    private readonly telemetry: TelemetryService,
  ) {
    const env = loadEnv();
    this.redis = new IORedis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
    this.model = env.OPENAI_MODEL_EMBED;
  }

  async embedQuery(text: string): Promise<number[]> {
    const key = `embed:q:${this.model}:${createHash('sha1').update(text).digest('hex')}`;
    if (this.redis.status !== 'ready') await this.redis.connect().catch(() => undefined);
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached) as number[];

    const [embedding] = await this.embedBatch([text]);
    if (!embedding) throw new Error('OpenAI returned no embedding');
    await this.redis.set(key, JSON.stringify(embedding), 'EX', CACHE_TTL_SEC);
    return embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const startedAt = Date.now();
      const response = await this.openai.raw.embeddings.create({ model: this.model, input: batch });
      await this.telemetry.record({
        model: this.model,
        promptTokens: response.usage?.total_tokens ?? 0,
        completionTokens: 0,
        latencyMs: Date.now() - startedAt,
      });
      for (const item of response.data) embeddings.push(item.embedding);
    }
    return embeddings;
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit().catch(() => undefined);
  }
}
