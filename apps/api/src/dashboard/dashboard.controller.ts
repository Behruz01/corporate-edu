import { Controller, Get, Param } from '@nestjs/common';
import { Role } from '@corpmind/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthPrincipal } from '../common/types/authenticated-request';
import { DashboardService } from './dashboard.service';

@Controller()
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('dashboard/team-overview')
  @Roles(Role.MANAGER, Role.HR_ADMIN, Role.PLATFORM_ADMIN)
  teamOverview(@CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.dashboard.teamOverview(user);
  }

  @Get('dashboard/skill-gap')
  @Roles(Role.MANAGER, Role.HR_ADMIN, Role.PLATFORM_ADMIN)
  skillGap(@CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.dashboard.skillGap(user);
  }

  @Get('dashboard/knowledge-risk')
  @Roles(Role.MANAGER, Role.HR_ADMIN, Role.PLATFORM_ADMIN)
  knowledgeRisk(@CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.dashboard.knowledgeRisk(user);
  }

  @Get('dashboard/most-asked')
  @Roles(Role.MANAGER, Role.HR_ADMIN, Role.PLATFORM_ADMIN)
  mostAsked(@CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.dashboard.mostAsked(user);
  }

  @Get('dashboard/employee/:id')
  @Roles(Role.MANAGER, Role.HR_ADMIN, Role.PLATFORM_ADMIN)
  employee(@Param('id') id: string, @CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.dashboard.employee(id, user);
  }

  @Get('admin/analytics/overview')
  @Roles(Role.HR_ADMIN, Role.PLATFORM_ADMIN)
  adminOverview(@CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.dashboard.adminOverview(user);
  }
}
