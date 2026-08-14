import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Max, Min } from 'class-validator';

export class SubmitScoreDto {
  @ApiProperty({ example: 8.5, minimum: 1, maximum: 10 })
  @IsNumber()
  @Min(1)
  @Max(10)
  value: number;
}
