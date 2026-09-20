import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { MIN_PARTICIPANT_AGE } from '../category.model';

export class UpdateAgeRangeDto {
  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(MIN_PARTICIPANT_AGE)
  ageFrom: number;

  @ApiProperty({ example: 15 })
  @IsInt()
  @Min(MIN_PARTICIPANT_AGE)
  ageTo: number;
}
