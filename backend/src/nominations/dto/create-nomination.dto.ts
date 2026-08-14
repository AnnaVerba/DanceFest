import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateNominationDto {
  @ApiProperty({ example: 'Соло · Діти · Дебют · Фрі Денс' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 600 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}
