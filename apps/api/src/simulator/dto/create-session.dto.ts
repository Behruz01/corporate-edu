import { IsString, MinLength } from 'class-validator';

export class CreateSimulatorSessionDto {
  @IsString()
  @MinLength(1)
  scenarioId!: string;
}
