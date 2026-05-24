import { IsString, MaxLength, MinLength } from 'class-validator';

export class AnswerOffboardingQaDto {
  @IsString()
  @MinLength(2)
  @MaxLength(12000)
  text!: string;
}
