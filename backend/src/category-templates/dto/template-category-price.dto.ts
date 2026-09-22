import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsUUID, Min } from 'class-validator';
import { MIN_CATEGORY_PRICE } from '../category-templates.constants';

export class TemplateCategoryPriceDto {
  @ApiProperty({
    description:
      'A category on a priced axis (lineup or level). Any other axis is rejected.',
  })
  @IsUUID('4')
  categoryId: string;

  @ApiProperty({ example: 700 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(MIN_CATEGORY_PRICE)
  price: number;
}
