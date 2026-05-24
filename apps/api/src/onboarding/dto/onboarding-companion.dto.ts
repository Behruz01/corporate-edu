import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class OnboardingCompanionAskDto {
  @IsString()
  @MinLength(2)
  @MaxLength(2_000)
  question!: string;

  @IsOptional()
  @IsString()
  conversationId?: string;
}
