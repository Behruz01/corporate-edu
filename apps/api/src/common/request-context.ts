import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestCtx = {
  requestId: string;
  tenantId?: string;
  userId?: string;
};

export const requestContext = new AsyncLocalStorage<RequestCtx>();

export function getRequestCtx(): RequestCtx | undefined {
  return requestContext.getStore();
}

export function getTenantIdOrThrow(): string {
  const ctx = requestContext.getStore();
  if (!ctx?.tenantId) {
    throw new Error('Tenant context missing — TenantGuard must run before tenant-scoped queries');
  }
  return ctx.tenantId;
}
