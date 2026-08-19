import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { CreateCategoryDto } from './create-category.dto';

// Один набір осей — це десятки значень, не сотні. Стеля тут лише щоб запит
// не став вектором навантаження.
export const MAX_CATEGORIES_PER_REQUEST = 200;

export class BulkCreateCategoriesDto {
  @ApiProperty({ type: [CreateCategoryDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_CATEGORIES_PER_REQUEST)
  @ValidateNested({ each: true })
  @Type(() => CreateCategoryDto)
  categories: CreateCategoryDto[];
}
