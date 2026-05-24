import { IsObject } from 'class-validator';

export class CompleteOnboardingDayDto {
  @IsObject()
  quizAnswers!: Record<string, unknown>;
}
