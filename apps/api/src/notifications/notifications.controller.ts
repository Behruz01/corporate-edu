import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthPrincipal } from '../common/types/authenticated-request';
import { NotificationsService } from './notifications.service';

@Controller()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('me/notifications')
  list(@CurrentUser() user: AuthPrincipal, @Query('unread') unread?: string): Promise<unknown> {
    return this.notifications.listForUser(user, unread === 'true');
  }

  @Post('me/notifications/:id/read')
  markRead(@CurrentUser() user: AuthPrincipal, @Param('id') id: string): Promise<unknown> {
    return this.notifications.markRead(user, id);
  }

  @Post('me/notifications/mark-all-read')
  markAllRead(@CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.notifications.markAllRead(user);
  }

  @Post('me/notifications/seed-demo')
  seedDemo(@CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.notifications.seedDemo(user);
  }
}
