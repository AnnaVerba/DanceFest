import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CategoryTemplateAxisDto } from './category-template-axis.dto';

export class CreateCategoryTemplateDto {
  @ApiProperty({ example: 'Східний танець — стандарт' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 'Базовий шаблон категорій для конкурсів зі східного танцю.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiProperty({ type: [CategoryTemplateAxisDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CategoryTemplateAxisDto)
  axes: CategoryTemplateAxisDto[];
}
