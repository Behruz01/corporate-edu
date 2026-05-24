import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDefined,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateOnboardingTemplateDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  role!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateOnboardingDayDto {
  @IsInt()
  @Min(1)
  @Max(30)
  dayNumber!: number;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(1_000)
  description!: string;

  @IsInt()
  @Min(5)
  @Max(480)
  estimatedMin!: number;
}

export class UpdateOnboardingDayDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  dayNumber?: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(1_000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  estimatedMin?: number;
}

export class CreateOnboardingTopicDto {
  @IsInt()
  @Min(1)
  @Max(50)
  order!: number;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(8_000)
  content!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  documentIds?: string[];
}

export class QuizQuestionDto {
  @IsString()
  type!: 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER';

  @IsString()
  @MinLength(2)
  @MaxLength(1_000)
  prompt!: string;

  @IsOptional()
  options?: unknown;

  @IsDefined()
  correct!: unknown;

  @IsOptional()
  @IsString()
  @MaxLength(1_000)
  explanation?: string;
}

export class CreateQuizDto {
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  questions!: QuizQuestionDto[];
}
