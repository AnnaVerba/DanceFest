import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsUUID, Min } from 'class-validator';
import { MIN_AXIS_PRICE } from '../nominations.constants';

export class AxisPriceDto {
  @ApiProperty({
    example: 'b3f1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
    description:
      'A lineup or league value. Other axes carry no price and are rejected.',
  })
  @IsUUID('4')
  categoryId: string;

  @ApiProperty({
    example: 700,
    description: 'Price of every nomination this value prices.',
  })
  @IsNumber()
  @Min(MIN_AXIS_PRICE)
  price: number;
}
