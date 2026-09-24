import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { MAX_CATEGORY_DESCRIPTION_LENGTH } from '../categories.constants';
import {
  AGE_CATEGORY_TYPE,
  CATEGORY_TYPES,
  MIN_RANGE_BOUND,
  MIN_SORT_ORDER,
  RANGED_CATEGORY_TYPES,
} from '../category.model';
import type { CategoryType } from '../category.model';

export class CreateCategoryDto {
  @ApiProperty({ example: '12-15' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: CATEGORY_TYPES, example: 'age' })
  @IsIn(CATEGORY_TYPES)
  type: CategoryType;

  // Обов'язкова для осей із межами: вікова категорія без них не бере участі
  // в автовизначенні, а склад без них не знає, скільком людям відповідає.
  @ApiPropertyOptional({
    example: 12,
    description: 'Required when type is age or lineup.',
  })
  @ValidateIf((dto: CreateCategoryDto) =>
    RANGED_CATEGORY_TYPES.includes(dto.type),
  )
  @IsInt()
  @Min(MIN_RANGE_BOUND)
  rangeFrom?: number;

  // Для віку обов'язкова. Для складу null означає «без верхньої межі»
  // (Група — троє й більше), тож перевіряється лише коли значення задане.
  @ApiPropertyOptional({
    example: 15,
    description:
      'Required when type is age. For lineup, null means no upper bound.',
  })
  @ValidateIf(
    (dto: CreateCategoryDto) =>
      dto.type === AGE_CATEGORY_TYPE ||
      (dto.rangeTo !== null && dto.rangeTo !== undefined),
  )
  @IsInt()
  @Min(MIN_RANGE_BOUND)
  rangeTo?: number | null;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(MIN_SORT_ORDER)
  sortOrder?: number;

  // Лише для адміна: сервіс відхиляє поле від решти.
  @ApiPropertyOptional({
    example: 'Учасники 18 років і старші',
    description: 'Admin only. An empty string removes the description.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_CATEGORY_DESCRIPTION_LENGTH)
  description?: string;
}
