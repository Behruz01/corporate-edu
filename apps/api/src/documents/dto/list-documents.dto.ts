import { IsOptional, IsString } from 'class-validator';

export class ListDocumentsDto {
  @IsOptional()
  @IsString()
  status?: string;
}
