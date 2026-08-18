import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class UpdateNominationDto {
  // Прив'язка номінації до майданчика (крок «Розподіл» майстра створення
  // конкурсу); null знімає прив'язку.
  @ApiPropertyOptional({ example: 'b1f2c3d4-...' })
  @IsOptional()
  @IsUUID()
  venueId?: string | null;
}
