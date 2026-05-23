import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AskKbDto {
  @IsString()
  @MinLength(2)
  @MaxLength(4000)
  question!: string;

  @IsOptional()
  @IsString()
  conversationId?: string;
}
