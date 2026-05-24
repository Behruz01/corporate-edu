import { IsArray, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { NoteKind, NoteVisibility } from '@prisma/client';

export class UpdateNoteDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  projectId?: string | null;

  @IsOptional()
  @IsIn(Object.values(NoteKind))
  kind?: NoteKind;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  prompt?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(12000)
  text?: string;

  @IsOptional()
  @IsIn(Object.values(NoteVisibility))
  visibility?: NoteVisibility;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];
}
