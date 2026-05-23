import { IsIn } from 'class-validator';
import { Lang } from '@corpmind/shared';

export class UpdateLangDto {
  @IsIn(Object.values(Lang))
  lang!: 'UZ' | 'RU' | 'EN';
}
