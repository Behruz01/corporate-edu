import { IsString, MaxLength, MinLength } from 'class-validator';

export class AskPersonaDto {
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  question!: string;
}
