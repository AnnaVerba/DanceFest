import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { AxisDto } from './axis.dto';

export class CreateCategoryTemplateDto {
  @ApiProperty({ example: 'Східний танець — стандарт' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Для конкурсів соло та дуетів' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiProperty({ type: [AxisDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AxisDto)
  axes: AxisDto[];
}
