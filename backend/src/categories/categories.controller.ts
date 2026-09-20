import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import { BulkCreateCategoriesDto } from './dto/bulk-create-categories.dto';
import { UpdateAgeRangeDto } from './dto/update-age-range.dto';

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
    return this.categoriesService.findOrCreate(dto);
  }

  @ApiOperation({
    summary: 'Create many categories at once',
    description:
      'Used right before a category set is saved: values typed into the axes are held in the browser until then, so an abandoned wizard leaves nothing behind. ' +
      'Existing values are reused, and the response keeps the request order.',
  })
  @ApiResponse({ status: 201, description: 'Categories created or reused.' })
  @ApiResponse({
    status: 400,
    description: 'Validation failed, or the batch exceeds the size limit.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @Post('bulk')
  createMany(@Body() dto: BulkCreateCategoriesDto) {
    return this.categoriesService.findOrCreateMany(dto.categories);
  }

  @ApiOperation({
    summary: 'Change the age bounds of an age category',
    description:
      'The dictionary is shared, so the new bounds apply everywhere the category is used. Overlapping ranges are allowed.',
  })
  @ApiResponse({ status: 200, description: 'Bounds updated.' })
  @ApiResponse({ status: 400, description: 'Not an age category or invalid bounds.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  @Patch(':id/age-range')
  updateAgeRange(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgeRangeDto,
  ) {
    return this.categoriesService.updateAgeRange(id, dto);
  }
}
