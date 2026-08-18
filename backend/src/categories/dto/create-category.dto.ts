import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { CATEGORY_TYPES } from '../category.model';
import type { CategoryType } from '../category.model';

export class CreateCategoryDto {
  @ApiProperty({ example: '12-15' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: CATEGORY_TYPES, example: 'age' })
  @IsIn(CATEGORY_TYPES as unknown as string[])
  type: CategoryType;
}
