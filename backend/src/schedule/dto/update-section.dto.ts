import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

const HH_MM_PATTERN = /^([0-1]\d|2[0-3]):([0-5]\d)$/;

export class UpdateSectionDto {
  @ApiPropertyOptional({ example: 'Відділення 2' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ example: '10:30', description: 'Час початку, ГГ:ХХ.' })
  @IsOptional()
  @Matches(HH_MM_PATTERN, { message: 'Час початку має бути у форматі ГГ:ХХ' })
  startTime?: string;
}
