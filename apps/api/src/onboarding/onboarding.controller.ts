import { Body, Controller, Get, Param, Patch, Post, Sse } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Role } from '@corpmind/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthPrincipal } from '../common/types/authenticated-request';
import { CreateOnboardingAssignmentDto } from './dto/onboarding-assignment.dto';
import { OnboardingCompanionAskDto } from './dto/onboarding-companion.dto';
import { CompleteOnboardingDayDto } from './dto/onboarding-complete-day.dto';
import {
  CreateOnboardingDayDto,
  CreateOnboardingTemplateDto,
  CreateOnboardingTopicDto,
  CreateQuizDto,
  UpdateOnboardingDayDto,
} from './dto/onboarding-template.dto';
import { OnboardingService } from './onboarding.service';

const ADMIN_ROLES = [Role.HR_ADMIN, Role.PLATFORM_ADMIN] as const;

@Controller()
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get('onboarding/templates')
  @Roles(...ADMIN_ROLES)
  listTemplates(): Promise<unknown> {
    return this.onboarding.listTemplates();
  }

  @Post('onboarding/templates')
  @Roles(...ADMIN_ROLES)
  createTemplate(
    @Body() dto: CreateOnboardingTemplateDto,
    @CurrentUser() user: AuthPrincipal,
  ): Promise<unknown> {
    return this.onboarding.createTemplate(dto, user);
  }

  @Get('onboarding/templates/:id')
  @Roles(...ADMIN_ROLES)
  getTemplate(@Param('id') id: string): Promise<unknown> {
    return this.onboarding.getTemplate(id);
  }

  @Post('onboarding/templates/:id/days')
  @Roles(...ADMIN_ROLES)
  addDay(@Param('id') id: string, @Body() dto: CreateOnboardingDayDto): Promise<unknown> {
    return this.onboarding.addDay(id, dto);
  }

  @Patch('onboarding/days/:id')
  @Roles(...ADMIN_ROLES)
  updateDay(@Param('id') id: string, @Body() dto: UpdateOnboardingDayDto): Promise<unknown> {
    return this.onboarding.updateDay(id, dto);
  }

  @Post('onboarding/days/:id/topics')
  @Roles(...ADMIN_ROLES)
  addTopic(@Param('id') id: string, @Body() dto: CreateOnboardingTopicDto): Promise<unknown> {
    return this.onboarding.addTopic(id, dto);
  }

  @Post('onboarding/days/:id/quiz')
  @Roles(...ADMIN_ROLES)
  setQuiz(@Param('id') id: string, @Body() dto: CreateQuizDto): Promise<unknown> {
    return this.onboarding.setQuiz(id, dto);
  }

  @Post('onboarding/assignments')
  @Roles(...ADMIN_ROLES)
  createAssignment(
    @Body() dto: CreateOnboardingAssignmentDto,
    @CurrentUser() user: AuthPrincipal,
  ): Promise<unknown> {
    return this.onboarding.createAssignment(dto, user);
  }

  @Get('me/onboarding')
  me(@CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.onboarding.getMine(user);
  }

  @Post('me/onboarding/days/:dayId/start')
  startDay(@Param('dayId') dayId: string, @CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.onboarding.startDay(dayId, user);
  }

  @Post('me/onboarding/days/:dayId/complete')
  completeDay(
    @Param('dayId') dayId: string,
    @Body() dto: CompleteOnboardingDayDto,
    @CurrentUser() user: AuthPrincipal,
  ): Promise<unknown> {
    return this.onboarding.completeDay(dayId, dto, user);
  }

  @Post('me/onboarding/companion/ask')
  @Sse()
  askCompanion(
    @Body() dto: OnboardingCompanionAskDto,
    @CurrentUser() user: AuthPrincipal,
  ): Observable<MessageEvent> {
    return this.onboarding.askCompanionStream(dto, user);
  }
}
