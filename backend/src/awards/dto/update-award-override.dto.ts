import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  MAX_AWARD_LINE_KEY_LENGTH,
  MIN_AWARD_QUANTITY,
} from '../awards.constants';

export class UpdateAwardOverrideDto {
  @ApiProperty({ example: 'cups:Формейшн', description: 'AwardLine.key' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_AWARD_LINE_KEY_LENGTH)
  key: string;

  @ApiProperty({
    example: 5,
    nullable: true,
    description:
      'Hand-typed quantity; null resets the line to the calculated value.',
  })
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(MIN_AWARD_QUANTITY)
  value: number | null;
}
