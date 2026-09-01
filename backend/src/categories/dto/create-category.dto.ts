import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { CATEGORY_TYPES, MIN_PARTICIPANT_AGE } from '../category.model';
import type { CategoryType } from '../category.model';

export class CreateCategoryDto {
  @ApiProperty({ example: '12-15' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: CATEGORY_TYPES, example: 'age' })
  @IsIn(CATEGORY_TYPES)
  type: CategoryType;

  // Обов'язкові саме для вікової осі: без меж категорія не бере участі в
  // автовизначенні, і заявка мовчки не знаходить вік учасника.
  @ApiPropertyOptional({
    example: 12,
    description: 'Required when type is age.',
  })
  @ValidateIf((dto: CreateCategoryDto) => dto.type === 'age')
  @IsInt()
  @Min(MIN_PARTICIPANT_AGE)
  ageFrom?: number;

  @ApiPropertyOptional({
    example: 15,
    description: 'Required when type is age.',
  })
  @ValidateIf((dto: CreateCategoryDto) => dto.type === 'age')
  @IsInt()
  @Min(MIN_PARTICIPANT_AGE)
  ageTo?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
