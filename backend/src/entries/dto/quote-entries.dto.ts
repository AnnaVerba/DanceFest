import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import {
  MAX_ENTRY_PARTICIPANTS,
  MAX_QUOTE_PARTICIPANTS,
} from '../entries.constants';
import { MAX_ENTRIES_PER_SUBMISSION } from './bulk-create-entries.dto';

export class QuoteEntriesDto {
  @ApiPropertyOptional({
    type: [String],
    description:
      'Named dancers of the number. Omit for a group submitted by headcount only.',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_QUOTE_PARTICIPANTS)
  @IsUUID(undefined, { each: true })
  participantIds?: string[];

  @ApiPropertyOptional({
    example: 8,
    description:
      'Headcount of the number. Whoever is not named in `participantIds` is priced as a paying dancer.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_ENTRY_PARTICIPANTS)
  participantsCount?: number;

  @ApiProperty({
    type: [String],
    description: 'One id per selected row; an improvisation row repeats its id.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_ENTRIES_PER_SUBMISSION)
  @IsUUID(undefined, { each: true })
  nominationIds: string[];
}
