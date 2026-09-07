import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

const HH_MM_PATTERN = /^([0-1]\d|2[0-3]):([0-5]\d)$/;

export class BuildSectionDto {
  @ApiProperty({ description: 'День конкурсу, до якого належить відділення.' })
  @IsUUID()
  dayId: string;

  @ApiPropertyOptional({ description: 'Майданчик. Не обовʼязково.' })
  @IsOptional()
  @IsUUID()
  venueId?: string;

  @ApiProperty({ example: 'Відділення 1' })
  @IsString()
  name: string;

  @ApiProperty({ example: '09:00', description: 'Час початку, ГГ:ХХ.' })
  @Matches(HH_MM_PATTERN, { message: 'Час початку має бути у форматі ГГ:ХХ' })
  startTime: string;

  @ApiProperty({
    type: [String],
    description: 'Виходи (entries), які потрапляють у відділення.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  entryIds: string[];
}
