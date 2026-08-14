import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedAdmin } from '../auth/current-user.decorator';
import { CategoryTemplatesService } from './category-templates.service';
import { CreateCategoryTemplateDto } from './dto/create-category-template.dto';

@ApiTags('category-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('category-templates')
export class CategoryTemplatesController {
  constructor(
    private readonly categoryTemplatesService: CategoryTemplatesService,
  ) {}

  @ApiOperation({
    summary: 'List category templates',
    description:
      "Returns every public template plus the caller's own private ones.",
  })
  @ApiResponse({ status: 200, description: 'Templates returned.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @Get()
  list(@CurrentUser() admin: AuthenticatedAdmin) {
    return this.categoryTemplatesService.list(admin.id);
  }

  @ApiOperation({ summary: 'Create a category template' })
  @ApiResponse({ status: 201, description: 'Template created.' })
  @ApiResponse({
    status: 400,
    description: 'Validation failed for one or more fields.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @Post()
  create(
    @CurrentUser() admin: AuthenticatedAdmin,
    @Body() dto: CreateCategoryTemplateDto,
  ) {
    return this.categoryTemplatesService.create(admin.id, dto);
  }

  @ApiOperation({ summary: 'Delete a category template' })
  @ApiResponse({ status: 204, description: 'Template deleted.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'Only the author can delete this template.',
  })
  @ApiResponse({
    status: 404,
    description: 'No template exists with the given id.',
  })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() admin: AuthenticatedAdmin) {
    return this.categoryTemplatesService.remove(id, admin.id);
  }
}
