import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { HealthModule } from './health/health.module';
import { AppController } from './app.controller';
import { AUTH_GLOBAL_GUARDS } from './auth/auth.providers';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    CommonModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    AuthModule,
    TenantsModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [...AUTH_GLOBAL_GUARDS, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
