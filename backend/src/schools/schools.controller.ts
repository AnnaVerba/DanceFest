import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { Public } from '../auth/public.decorator';

@ApiTags('schools')
@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @ApiOperation({ summary: 'Search schools by name (typeahead, needs q)' })
  @ApiResponse({ status: 200, description: 'Matching schools returned.' })
  // Public: a trainer picks their studio on /register, before any session.
  @Public()
  @Get()
  search(@Query('q') q?: string) {
    return this.schoolsService.search(q);
  }

  @ApiOperation({ summary: 'Get a school by id' })
  @ApiResponse({ status: 200, description: 'School returned.' })
  @ApiResponse({
    status: 404,
    description: 'No school exists with the given id.',
  })
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.schoolsService.findByIdOrFail(id);
  }

  @ApiOperation({ summary: 'Create a school' })
  @ApiResponse({ status: 201, description: 'School created.' })
  @ApiResponse({
    status: 400,
    description: 'Validation failed for one or more fields.',
  })
  @ApiResponse({
    status: 409,
    description: 'A school with this name already exists.',
  })
  // Public: a studio head adds a new studio on /register, before any
  // session. A name already taken is refused.
  @Public()
  @Post()
  create(@Body() dto: CreateSchoolDto) {
    return this.schoolsService.create(dto);
  }
}
