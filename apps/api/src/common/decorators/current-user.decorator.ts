import { type ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { AuthenticatedRequest, AuthPrincipal } from '../types/authenticated-request';

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthPrincipal => {
  const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!req.user) throw new Error('No authenticated user on request');
  return req.user;
});
