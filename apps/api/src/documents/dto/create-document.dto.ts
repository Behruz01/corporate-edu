import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Lang } from '@corpmind/shared';

export class CreateDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;

  @IsIn(Object.values(Lang))
  lang!: 'UZ' | 'RU' | 'EN';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  visibility?: string;
}
