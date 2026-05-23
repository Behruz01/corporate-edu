import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';
import { requestContext } from '../common/request-context';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req.user?.tenantId) throw new ForbiddenException('Tenant context missing');
    const store = requestContext.getStore();
    if (store) store.tenantId = req.user.tenantId;
    return true;
  }
}
