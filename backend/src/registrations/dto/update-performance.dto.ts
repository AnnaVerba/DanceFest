import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

const ROUNDS = ['final', 'semifinal'] as const;
const STATUSES = ['scheduled', 'absent', 'withdrawn'] as const;

export class UpdatePerformanceDto {
  @ApiPropertyOptional({ enum: ROUNDS })
  @IsOptional()
  @IsIn(ROUNDS)
  round?: (typeof ROUNDS)[number];

  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];
}
