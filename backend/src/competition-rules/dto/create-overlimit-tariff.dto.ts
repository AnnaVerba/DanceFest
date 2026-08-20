import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, Min } from 'class-validator';

export class CreateOverlimitTariffDto {
  @ApiProperty({
    example: 30,
    description: 'Overrun bracket: chargeable up to this many seconds over.',
  })
  @IsInt()
  @Min(1)
  uptoSeconds: number;

  @ApiProperty({ example: 150 })
  @IsNumber()
  @Min(0)
  price: number;
}
