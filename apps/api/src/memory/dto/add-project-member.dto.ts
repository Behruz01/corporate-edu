import { IsString, MaxLength, MinLength } from 'class-validator';

export class AddProjectMemberDto {
  @IsString()
  @MinLength(5)
  userId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  role!: string;
}
