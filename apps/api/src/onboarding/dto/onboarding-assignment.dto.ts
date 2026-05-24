import { IsString, MinLength } from 'class-validator';

export class CreateOnboardingAssignmentDto {
  @IsString()
  @MinLength(2)
  userId!: string;

  @IsString()
  @MinLength(2)
  templateId!: string;
}
