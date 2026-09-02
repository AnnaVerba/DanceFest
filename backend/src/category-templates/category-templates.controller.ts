import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedAdmin } from '../auth/current-user.decorator';
import { CategoryTemplatesService } from './category-templates.service';
import { CreateCategoryTemplateDto } from './dto/create-category-template.dto';
import { UpdateCategoryTemplateDto } from './dto/update-category-template.dto';
import { ForkCategoryTemplateDto } from './dto/fork-category-template.dto';

@ApiTags('category-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('category-templates')
export class CategoryTemplatesController {
  constructor(
    private readonly categoryTemplatesService: CategoryTemplatesService,
  ) {}

  @ApiOperation({
    summary: 'List category templates',
    description:
      "Returns every public template plus the caller's own private ones, each with its " +
      'nomination count, its criteria grouped by axis, and its special nominations.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Case-insensitive substring of the template name.',
  })
  @ApiResponse({ status: 200, description: 'Templates returned.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @Get()
  list(
    @CurrentUser() admin: AuthenticatedAdmin,
    @Query('search') search?: string,
  ) {
    return this.categoryTemplatesService.list(admin.id, search);
  }

  @ApiOperation({
    summary: 'Get one category template with its nominations',
  })
  @ApiResponse({ status: 200, description: 'Template returned.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 404,
    description: 'No readable template exists with the given id.',
  })
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() admin: AuthenticatedAdmin) {
    return this.categoryTemplatesService.findOne(id, admin.id);
  }

  @ApiOperation({
    summary: 'Create a category template',
    description:
      'Admin-only — an Organizer can read and use templates, not author them.',
  })
  @ApiResponse({ status: 201, description: 'Template created.' })
  @ApiResponse({
    status: 400,
    description: 'Validation failed for one or more fields.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'This action is not available for your role.',
  })
  @Roles(Role.ADMIN)
  @Post()
  create(
    @CurrentUser() admin: AuthenticatedAdmin,
    @Body() dto: CreateCategoryTemplateDto,
  ) {
    return this.categoryTemplatesService.create(admin.id, dto);
  }

  @ApiOperation({
    summary: 'Update a category template',
    description:
      'Only the author may update. Sending nominations replaces the whole set.',
  })
  @ApiResponse({ status: 200, description: 'Template updated.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description:
      'This action is not available for your role, or you are not the author.',
  })
  @ApiResponse({ status: 404, description: 'Template not found.' })
  @Roles(Role.ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedAdmin,
    @Body() dto: UpdateCategoryTemplateDto,
  ) {
    return this.categoryTemplatesService.update(id, admin.id, dto);
  }

  @ApiOperation({
    summary: 'Fork a template',
    description:
      'Copies a readable template into a private one owned by the caller. Admin-only, ' +
      'same as create — the copy still needs an Admin author.',
  })
  @ApiResponse({ status: 201, description: 'Fork created.' })
  @ApiResponse({
    status: 400,
    description: 'The copy name matches the source name.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'This action is not available for your role.',
  })
  @ApiResponse({ status: 404, description: 'Template not found.' })
  @Roles(Role.ADMIN)
  @Post(':id/fork')
  fork(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedAdmin,
    @Body() dto: ForkCategoryTemplateDto,
  ) {
    return this.categoryTemplatesService.fork(id, admin.id, dto);
  }

  @ApiOperation({ summary: 'Delete a category template' })
  @ApiResponse({ status: 204, description: 'Template deleted.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description:
      'This action is not available for your role, or you are not the author.',
  })
  @ApiResponse({
    status: 404,
    description: 'No template exists with the given id.',
  })
  @ApiResponse({
    status: 409,
    description:
      'TEMPLATE_IN_USE — a competition already has nominations generated from this template.',
  })
  @Roles(Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() admin: AuthenticatedAdmin) {
    return this.categoryTemplatesService.remove(id, admin.id);
  }
}
