import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { AWARD_SYSTEMS } from '../award-system';
import type { AwardSystem } from '../award-system';

export class UpdateAwardSystemDto {
  @ApiProperty({
    example: 'medal_standings',
    enum: AWARD_SYSTEMS,
    description:
      'standard — only «медаль кожному» leagues spread medals; medal_standings — every category does.',
  })
  @IsIn(AWARD_SYSTEMS)
  awardSystem: AwardSystem;
}
