import { APP_GUARD } from '@nestjs/core';
import { JwtGuard } from './jwt.guard';
import { TenantGuard } from './tenant.guard';
import { RolesGuard } from './roles.guard';

export const AUTH_GLOBAL_GUARDS = [
  { provide: APP_GUARD, useClass: JwtGuard },
  { provide: APP_GUARD, useClass: TenantGuard },
  { provide: APP_GUARD, useClass: RolesGuard },
];
