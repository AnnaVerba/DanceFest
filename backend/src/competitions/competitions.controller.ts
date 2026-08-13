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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CompetitionsService } from './competitions.service';
import { CreateCompetitionDto } from './dto/create-competition.dto';
import { UpdateCompetitionDto } from './dto/update-competition.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedAdmin } from '../auth/current-user.decorator';

@ApiTags('competitions')
@Controller('competitions')
export class CompetitionsController {
  constructor(private readonly competitionsService: CompetitionsService) {}

  @ApiOperation({ summary: 'List all competitions' })
  @ApiResponse({
    status: 200,
    description: 'Competitions returned successfully.',
  })
  @Get()
  findAll() {
    return this.competitionsService.findAll();
  }

  @ApiOperation({ summary: 'Get a single competition by id' })
  @ApiResponse({ status: 200, description: 'Competition found.' })
  @ApiResponse({
    status: 404,
    description: 'No competition exists with the given id.',
  })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.competitionsService.findOne(id);
  }

  @ApiOperation({ summary: 'Create a new competition' })
  @ApiResponse({
    status: 201,
    description: 'Competition created; the caller becomes its owner.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed for one or more fields.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Body() createCompetitionDto: CreateCompetitionDto,
    @CurrentUser() admin: AuthenticatedAdmin,
  ) {
    return this.competitionsService.create(createCompetitionDto, admin.id);
  }

  @ApiOperation({ summary: 'Update a competition' })
  @ApiResponse({ status: 200, description: 'Competition updated.' })
  @ApiResponse({
    status: 400,
    description: 'Validation failed for one or more fields.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'Only the owner or a team admin can update this competition.',
  })
  @ApiResponse({
    status: 404,
    description: 'No competition exists with the given id.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCompetitionDto: UpdateCompetitionDto,
    @CurrentUser() admin: AuthenticatedAdmin,
  ) {
    return this.competitionsService.update(id, updateCompetitionDto, admin.id);
  }

  @ApiOperation({ summary: 'Delete a competition' })
  @ApiResponse({ status: 204, description: 'Competition deleted.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'Only the owner can delete this competition.',
  })
  @ApiResponse({
    status: 404,
    description: 'No competition exists with the given id.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() admin: AuthenticatedAdmin) {
    return this.competitionsService.remove(id, admin.id);
  }
}
