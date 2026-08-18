import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsNotEmpty, IsString } from 'class-validator';

export class AxisDto {
  @ApiProperty({ example: 'Вік' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: ['Діти', 'Юніори', 'Дорослі'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  values: string[];
}
