import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, Min } from 'class-validator';
import {
  EXTRA_TIME_SECONDS_OPTIONS,
  type ExtraTimeSeconds,
} from '../entries.constants';

export class UpdateEntryExtraTimeDto {
  @ApiProperty({
    example: EXTRA_TIME_SECONDS_OPTIONS[0],
    enum: EXTRA_TIME_SECONDS_OPTIONS,
    description: 'Purchased additional on-stage time, in seconds.',
  })
  @IsIn(EXTRA_TIME_SECONDS_OPTIONS)
  purchasedSec: ExtraTimeSeconds;

  @ApiProperty({ example: 150, description: 'Fee charged for the extra time.' })
  @IsNumber()
  @Min(0)
  fee: number;
}
