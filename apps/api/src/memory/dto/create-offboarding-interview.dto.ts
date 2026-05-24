import { IsString, MinLength } from 'class-validator';

export class CreateOffboardingInterviewDto {
  @IsString()
  @MinLength(5)
  userId!: string;
}
