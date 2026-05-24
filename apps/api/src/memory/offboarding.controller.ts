import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Role } from '@corpmind/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthPrincipal } from '../common/types/authenticated-request';
import { AnswerOffboardingQaDto } from './dto/answer-offboarding-qa.dto';
import { CreateOffboardingInterviewDto } from './dto/create-offboarding-interview.dto';
import { MemoryService } from './memory.service';

@Controller()
export class OffboardingController {
  constructor(private readonly memory: MemoryService) {}

  @Post('offboarding/interviews')
  @Roles(Role.HR_ADMIN, Role.PLATFORM_ADMIN)
  createInterview(@Body() dto: CreateOffboardingInterviewDto, @CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.memory.createOffboardingInterview(dto, user);
  }

  @Get('me/offboarding/interview')
  myInterview(@CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.memory.myOffboardingInterview(user);
  }

  @Post('offboarding/interviews/:id/start')
  start(@Param('id') id: string, @CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.memory.startOffboardingInterview(id, user);
  }

  @Post('offboarding/interviews/:id/qa/:qaId/answer')
  answer(
    @Param('id') id: string,
    @Param('qaId') qaId: string,
    @Body() dto: AnswerOffboardingQaDto,
    @CurrentUser() user: AuthPrincipal,
  ): Promise<unknown> {
    return this.memory.answerOffboardingQuestion(id, qaId, dto, user);
  }

  @Post('offboarding/interviews/:id/complete')
  complete(@Param('id') id: string, @CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.memory.completeOffboardingInterview(id, user);
  }
}
