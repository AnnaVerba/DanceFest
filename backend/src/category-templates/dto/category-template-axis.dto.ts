import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsString } from 'class-validator';

export class CategoryTemplateAxisDto {
  @ApiProperty({ example: 'Вік' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: ['Baby', 'Mini Kids', 'Kids'], type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  values: string[];
}
