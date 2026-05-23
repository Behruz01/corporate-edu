import { type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { requestContext } from '../common/request-context';
import type { JwtPayload } from './jwt.strategy';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;
    const ok = (await super.canActivate(ctx)) as boolean;
    if (!ok) throw new UnauthorizedException();

    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const payload = req.user as unknown as JwtPayload;
    req.user = {
      userId: payload.sub,
      tenantId: payload.tid,
      role: payload.role,
      email: payload.email,
    };
    const store = requestContext.getStore();
    if (store) {
      store.tenantId = payload.tid;
      store.userId = payload.sub;
    }
    return true;
  }
}
