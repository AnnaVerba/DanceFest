import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  MAX_ALL_MEDAL_LEAGUES,
  MAX_LEAGUE_NAME_LENGTH,
} from '../awards.constants';

export class UpdateAllMedalLeaguesDto {
  @ApiProperty({
    type: [String],
    nullable: true,
    example: ['Дебют', 'Перші кроки'],
    description:
      '«Медаль кожному» leagues for this competition only; null resets the list to the category template.',
  })
  @ValidateIf((_, value) => value !== null)
  @IsArray()
  @ArrayMaxSize(MAX_ALL_MEDAL_LEAGUES)
  @IsString({ each: true })
  @MaxLength(MAX_LEAGUE_NAME_LENGTH, { each: true })
  leagues: string[] | null;
}
