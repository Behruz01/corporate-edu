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
import { StorageModule } from './storage/storage.module';
import { QueueModule } from './queue/queue.module';
import { AiModule } from './ai/ai.module';
import { DocumentsModule } from './documents/documents.module';
import { KbModule } from './kb/kb.module';
import { ScenariosModule } from './scenarios/scenarios.module';
import { SimulatorModule } from './simulator/simulator.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { MemoryModule } from './memory/memory.module';
import { GamificationModule } from './gamification/gamification.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    CommonModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    AuthModule,
    TenantsModule,
    HealthModule,
    StorageModule,
    QueueModule,
    AiModule,
    DocumentsModule,
    KbModule,
    ScenariosModule,
    SimulatorModule,
    DashboardModule,
    OnboardingModule,
    MemoryModule,
    GamificationModule,
  ],
  controllers: [AppController],
  providers: [...AUTH_GLOBAL_GUARDS, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
