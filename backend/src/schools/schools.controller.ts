import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';

@ApiTags('schools')
@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @ApiOperation({ summary: 'List all schools' })
  @ApiResponse({ status: 200, description: 'Schools returned.' })
  @Get()
  findAll() {
    return this.schoolsService.findAll();
  }

  @ApiOperation({ summary: 'Get a school by id' })
  @ApiResponse({ status: 200, description: 'School returned.' })
  @ApiResponse({
    status: 404,
    description: 'No school exists with the given id.',
  })
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
  @Post()
  create(@Body() dto: CreateSchoolDto) {
    return this.schoolsService.create(dto);
  }
}
