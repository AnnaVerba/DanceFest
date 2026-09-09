import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateMusicExportDto {
  @ApiPropertyOptional({ description: 'Filter to one venue only.' })
  @IsOptional()
  @IsUUID('4')
  venueId?: string;

  // Accepted but not applied — no entry/nomination in this codebase is
  // assigned to a specific day (competitions only have a dateFrom/dateTo
  // range). Flagged to the Developer; left unimplemented rather than
  // guessed at.
  @ApiPropertyOptional({
    description: 'Not implemented yet — accepted, ignored.',
  })
  @IsOptional()
  @IsString()
  day?: string;
}
