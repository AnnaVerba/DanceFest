import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { CreateEntryDto } from './create-entry.dto';

export const MAX_ENTRIES_PER_SUBMISSION = 50;

export class BulkCreateEntriesDto {
  @ApiProperty({ type: [CreateEntryDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_ENTRIES_PER_SUBMISSION)
  @ValidateNested({ each: true })
  @Type(() => CreateEntryDto)
  entries: CreateEntryDto[];
}
