import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class CreateMusicExportDto {
  @ApiPropertyOptional({ description: 'Filter to one venue only.' })
  @IsOptional()
  @IsUUID('4')
  venueId?: string;
}
