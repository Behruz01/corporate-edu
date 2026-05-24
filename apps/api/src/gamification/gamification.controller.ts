import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthPrincipal } from '../common/types/authenticated-request';
import { GamificationService } from './gamification.service';

@Controller()
export class GamificationController {
  constructor(private readonly gamification: GamificationService) {}

  @Get('me/points')
  myPoints(@CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.gamification.myPoints(user);
  }

  @Get('me/badges')
  myBadges(@CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.gamification.myBadges(user);
  }

  @Get('leaderboard')
  leaderboard(@CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.gamification.leaderboard(user);
  }
}
