import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CategoriesService } from './categories.service';
import { CATEGORY_TYPES } from './category.model';
import type { CategoryType } from './category.model';
import { CreateCategoryDto } from './dto/create-category.dto';

@ApiTags('categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @ApiOperation({
    summary: 'List categories',
    description:
      'Shared dictionary of category values, optionally filtered by type and name.',
  })
  @ApiQuery({ name: 'type', required: false, enum: CATEGORY_TYPES })
  @ApiQuery({ name: 'q', required: false })
  @ApiResponse({ status: 200, description: 'Categories returned.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @Get()
  list(@Query('type') type?: CategoryType, @Query('q') query?: string) {
    return this.categoriesService.list(type, query);
  }

  @ApiOperation({
    summary: 'Create a category',
    description:
      'Returns the existing category when the normalized name already exists for that type.',
  })
  @ApiResponse({ status: 201, description: 'Category created or reused.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.findOrCreate(dto.name, dto.type);
  }
}
