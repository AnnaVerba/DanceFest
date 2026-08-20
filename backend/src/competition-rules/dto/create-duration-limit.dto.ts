import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { DURATION_ROUNDS } from '../duration-limit.model';
import type { DurationRound } from '../duration-limit.model';

export class CreateDurationLimitDto {
  @ApiPropertyOptional({
    description:
      'Exact nomination this limit applies to. Mutually exclusive with categoryId — set exactly one.',
  })
  @IsOptional()
  @IsUUID('4')
  nominationId?: string;

  @ApiPropertyOptional({
    description:
      'Axis category (e.g. a league/level or age value) this limit applies to whenever a nomination carries it and has no more specific limit. Mutually exclusive with nominationId.',
  })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional({ example: 'final', enum: DURATION_ROUNDS })
  @IsOptional()
  @IsIn(DURATION_ROUNDS)
  round?: DurationRound;

  @ApiProperty({ example: 90 })
  @IsInt()
  @Min(1)
  seconds: number;
}
