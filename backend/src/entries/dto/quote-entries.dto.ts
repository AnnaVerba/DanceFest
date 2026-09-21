import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';
import { MAX_QUOTE_PARTICIPANTS } from '../entries.constants';
import { MAX_ENTRIES_PER_SUBMISSION } from './bulk-create-entries.dto';

export class QuoteEntriesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_QUOTE_PARTICIPANTS)
  @IsUUID(undefined, { each: true })
  participantIds: string[];

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
