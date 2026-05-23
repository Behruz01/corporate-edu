import { type CallHandler, type ExecutionContext, Injectable, Logger, type NestInterceptor } from '@nestjs/common';
import { type Observable, tap } from 'rxjs';
import type { AuthenticatedRequest } from './types/authenticated-request';

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
