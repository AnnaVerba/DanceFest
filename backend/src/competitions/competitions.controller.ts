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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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

  @Get()
  findAll() {
    return this.competitionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.competitionsService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Body() createCompetitionDto: CreateCompetitionDto,
    @CurrentUser() admin: AuthenticatedAdmin,
  ) {
    return this.competitionsService.create(createCompetitionDto, admin.id);
  }

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

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() admin: AuthenticatedAdmin) {
    return this.competitionsService.remove(id, admin.id);
  }
}
