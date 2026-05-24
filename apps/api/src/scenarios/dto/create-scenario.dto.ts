import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Difficulty, Lang } from '@corpmind/shared';

export class ScenarioCriterionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  dimension!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  weight?: number;

  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  rubric!: string;
}

export class CreateScenarioDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  category!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  brief!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  personaDesc!: string;

  @IsIn(Object.values(Difficulty))
  difficulty!: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';

  @IsIn(Object.values(Lang))
  lang!: 'UZ' | 'RU' | 'EN';

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScenarioCriterionDto)
  criteria?: ScenarioCriterionDto[];
}
