import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { RequestIdMiddleware } from './request-id.middleware';
import { RequestContextMiddleware } from './request-context.middleware';

@Module({})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware, RequestContextMiddleware).forRoutes('*');
  }
}
