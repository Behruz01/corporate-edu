import { IsArray, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { NoteKind, NoteVisibility } from '@prisma/client';

export class CreateNoteDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  projectId?: string;

  @IsIn(Object.values(NoteKind))
  kind!: NoteKind;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  prompt?: string;

  @IsString()
  @MinLength(5)
  @MaxLength(12000)
  text!: string;

  @IsIn(Object.values(NoteVisibility))
  visibility!: NoteVisibility;

  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags!: string[];
}
