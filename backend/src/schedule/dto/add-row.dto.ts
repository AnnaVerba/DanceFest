import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { MANUAL_ROW_TYPES } from '../section-item-type';
import type { SectionItemType } from '../section-item-type';

export class AddRowDto {
  @ApiProperty({ enum: MANUAL_ROW_TYPES, example: 'break' })
  @IsIn(MANUAL_ROW_TYPES)
  type: SectionItemType;

  @ApiProperty({ example: 'Перерва' })
  @IsString()
  @MinLength(1)
  label: string;

  @ApiProperty({ example: 600, description: 'Тривалість рядка, секунд.' })
  @IsInt()
  @Min(1)
  durationSeconds: number;

  @ApiPropertyOptional({
    description:
      'Вставити після цієї позиції. Без неї — у кінець, перед нагородженням.',
  })
  @IsOptional()
  @IsUUID()
  afterItemId?: string;
}
