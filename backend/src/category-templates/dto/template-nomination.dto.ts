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
import { EXIT_MODES } from '../../nominations/nomination-exits';
import type { ExitMode } from '../../nominations/nomination-exits';

export class TemplateNominationDto {
  @ApiProperty({ example: 'Соло · 12-15 · Профі · Хіп-хоп' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 350 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether the admin allows improvisation entries here.',
  })
  @IsOptional()
  @IsBoolean()
  allowsImprovisation?: boolean;

  @ApiPropertyOptional({ type: [String], description: 'Source category ids.' })
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

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
