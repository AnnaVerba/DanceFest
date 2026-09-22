import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class NominationBulkFilterDto {
  @ApiPropertyOptional({
    type: [String],
    description:
      'Match nominations that carry every one of these category ids (e.g. a style and a league).',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({
    example: 'Імпровізація',
    description: 'Case-insensitive substring match on the nomination name.',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description:
      'Match nominations on this venue; null matches nominations without a venue.',
  })
  @IsOptional()
  @IsUUID('4')
  venueId?: string | null;
}
