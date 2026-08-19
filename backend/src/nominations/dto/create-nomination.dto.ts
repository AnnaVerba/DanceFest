import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { EXIT_MODES } from '../nomination-exits';
import { IsProgramLimits } from './is-program-limits.validator';
import type { ExitMode } from '../nomination-exits';

export class CreateNominationDto {
  @ApiProperty({ example: 'Соло · Діти · Дебют · Фрі Денс' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 600 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether the admin allows improvisation entries here.',
  })
  @IsOptional()
  @IsBoolean()
  allowsImprovisation?: boolean;

  @ApiPropertyOptional({
    type: [String],
    description: 'Ids of the categories this nomination was generated from.',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({
    example: false,
    description:
      'A special category (cup, crown, battle): its disciplines stay inside one nomination.',
  })
  @IsOptional()
  @IsBoolean()
  isSpecial?: boolean;

  @ApiPropertyOptional({
    example: 'single',
    enum: EXIT_MODES,
    description:
      'single — every program is danced in one go; per_program — one stage exit per program.',
  })
  @IsOptional()
  @IsIn(EXIT_MODES)
  exitMode?: ExitMode;

  @ApiPropertyOptional({
    example: 180,
    description: 'Duration limit of a single stage exit, in seconds.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationLimitSeconds?: number;

  @ApiPropertyOptional({
    example: { '5a1c…': 90, '7b2d…': 120 },
    description:
      'Per-program duration limits, in seconds, keyed by category id.',
  })
  @IsOptional()
  @IsProgramLimits()
  programLimits?: Record<string, number>;
}
