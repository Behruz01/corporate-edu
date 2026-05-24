import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Difficulty } from '@corpmind/shared';

export class ListScenariosDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsIn(Object.values(Difficulty))
  difficulty?: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
}
