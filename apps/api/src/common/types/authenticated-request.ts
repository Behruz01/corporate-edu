import type { Request } from 'express';
import type { Role } from '@corpmind/shared';

export type AuthPrincipal = {
  userId: string;
  tenantId: string;
  role: Role;
  email: string;
};

export interface AuthenticatedRequest extends Request {
  user?: AuthPrincipal;
  requestId: string;
}
