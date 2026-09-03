import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { TIME_SOURCES } from '../competition-rule.model';
import type { TimeSource } from '../competition-rule.model';

export class UpdateCompetitionRuleDto {
  @ApiPropertyOptional({
    example: 20,
    description: 'Pause after a performance, in seconds (§8.6).',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  pauseSeconds?: number;

  @ApiPropertyOptional({
    example: 'limit',
    enum: TIME_SOURCES,
    description:
      'How time is counted while surcharges are off: the track itself, or the configured limit.',
  })
  @IsOptional()
  @IsIn(TIME_SOURCES)
  timeSource?: TimeSource;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  surchargesEnabled?: boolean;

  @ApiPropertyOptional({
    example: 10,
    description: 'Coach cut, percent — one value per competition (P3).',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  coachPercent?: number;

  @ApiPropertyOptional({
    example: 12,
    description: 'Above this many entries in an axis, a semifinal kicks in.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  semifinalThreshold?: number;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsInt()
  @Min(1)
  improvGroupSeconds?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  improvIndividualSeconds?: number;

  @ApiPropertyOptional({
    example: 3,
    description: 'How many judges must submit a sheet for a valid result.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  quorum?: number;
}
