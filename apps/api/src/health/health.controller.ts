import { Controller, Get } from '@nestjs/common';
import IORedis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators/public.decorator';
import { loadEnv } from '../config/env';

@Controller('health')
export class HealthController {
  private readonly redis: IORedis;
  constructor(private readonly prisma: PrismaService) {
    this.redis = new IORedis(loadEnv().REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
  }

  @Public()
  @Get()
  async check(): Promise<{ status: string; postgres: string; redis: string }> {
    let pg = 'down';
    let rd = 'down';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      pg = 'up';
    } catch {
      // keep "down"
    }
    try {
      if (this.redis.status !== 'ready') await this.redis.connect().catch(() => {});
      const pong = await this.redis.ping();
      rd = pong === 'PONG' ? 'up' : 'down';
    } catch {
      // keep "down"
    }
    const status = pg === 'up' && rd === 'up' ? 'ok' : 'degraded';
    return { status, postgres: pg, redis: rd };
  }
}
