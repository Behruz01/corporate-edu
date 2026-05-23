import { IsIn } from 'class-validator';

export class RateMessageDto {
  @IsIn([-1, 1])
  rating!: -1 | 1;
}
