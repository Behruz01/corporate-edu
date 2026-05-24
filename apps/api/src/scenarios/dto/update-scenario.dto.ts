import { IsArray, IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Difficulty, Lang } from '@corpmind/shared';
import { ScenarioCriterionDto } from './create-scenario.dto';

export class UpdateScenarioDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  brief?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  personaDesc?: string;

  @IsOptional()
  @IsIn(Object.values(Difficulty))
  difficulty?: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';

  @IsOptional()
  @IsIn(Object.values(Lang))
  lang?: 'UZ' | 'RU' | 'EN';

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScenarioCriterionDto)
  criteria?: ScenarioCriterionDto[];
}
