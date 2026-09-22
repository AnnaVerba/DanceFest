import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { TemplateNominationDto } from './template-nomination.dto';
import { TemplateCategoryPriceDto } from './template-category-price.dto';
import { MAX_TEMPLATE_NOMINATIONS } from '../category-templates.constants';

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

  @ApiPropertyOptional({
    type: [String],
    example: ['Дебют', 'Перші кроки'],
    description:
      'Leagues where every performance of a category gets a place medal.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allMedalLeagues?: string[];

  @ApiPropertyOptional({
    type: [TemplateCategoryPriceDto],
    description:
      'Prices per value of a priced axis (lineup, level). Every nomination price is derived from these.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateCategoryPriceDto)
  categoryPrices?: TemplateCategoryPriceDto[];

  @ApiProperty({ type: [TemplateNominationDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_TEMPLATE_NOMINATIONS)
  @ValidateNested({ each: true })
  @Type(() => TemplateNominationDto)
  nominations: TemplateNominationDto[];
}
