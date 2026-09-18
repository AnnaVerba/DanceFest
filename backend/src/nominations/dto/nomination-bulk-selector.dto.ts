import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { MAX_NOMINATIONS_PER_REQUEST } from './bulk-create-nominations.dto';
import { NominationBulkFilterDto } from './nomination-bulk-filter.dto';

export class NominationBulkSelectorDto {
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
}
