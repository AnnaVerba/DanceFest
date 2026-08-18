import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { CreateNominationDto } from './create-nomination.dto';

// Стеля та сама, що й у генераторі на фронті: п'ять типів по десять значень
// дають 100 000 комбінацій, і без межі це кладе і браузер, і базу.
export const MAX_NOMINATIONS_PER_REQUEST = 2000;

export class BulkCreateNominationsDto {
  @ApiProperty({ type: [CreateNominationDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_NOMINATIONS_PER_REQUEST)
  @ValidateNested({ each: true })
  @Type(() => CreateNominationDto)
  nominations: CreateNominationDto[];
}
