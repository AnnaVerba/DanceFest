import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateRowDto {
  @ApiPropertyOptional({ example: 'Обідня перерва' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  label?: string;

  @ApiPropertyOptional({ example: 900 })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationSeconds?: number;
}
