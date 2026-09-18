import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { MAX_NOMINATIONS_PER_REQUEST } from './bulk-create-nominations.dto';

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
}

export class BulkSetImprovisationDto {
  @ApiPropertyOptional({
    type: [String],
    description:
      'Explicit nomination ids to update. Mutually exclusive with `filter` — ' +
      'use this for a hand-picked selection, `filter` for reaching hundreds of ' +
      'nominations at once without listing every id.',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_NOMINATIONS_PER_REQUEST)
  @IsUUID('4', { each: true })
  nominationIds?: string[];

  @ApiPropertyOptional({
    type: NominationBulkFilterDto,
    description:
      'Selects nominations by criteria. Mutually exclusive with `nominationIds`.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NominationBulkFilterDto)
  filter?: NominationBulkFilterDto;

  @ApiProperty({
    example: true,
    description: 'Value to apply to every matched nomination.',
  })
  @IsBoolean()
  allowsImprovisation: boolean;
}
