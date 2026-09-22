import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { AxisPriceDto } from './axis-price.dto';
import { MAX_AXIS_PRICES_PER_REQUEST } from '../nominations.constants';

export class BulkSetAxisPricesDto {
  @ApiProperty({
    type: [AxisPriceDto],
    description:
      'Prices to apply to this competition only. A value left out keeps whatever ' +
      'its nominations cost now.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_AXIS_PRICES_PER_REQUEST)
  @ValidateNested({ each: true })
  @Type(() => AxisPriceDto)
  prices: AxisPriceDto[];
}
