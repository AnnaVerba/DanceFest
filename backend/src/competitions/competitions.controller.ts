import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CompetitionsService } from './competitions.service';
import { CreateCompetitionDto } from './dto/create-competition.dto';
import { UpdateCompetitionDto } from './dto/update-competition.dto';

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

  @Post()
  create(@Body() createCompetitionDto: CreateCompetitionDto) {
    return this.competitionsService.create(createCompetitionDto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCompetitionDto: UpdateCompetitionDto,
  ) {
    return this.competitionsService.update(id, updateCompetitionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.competitionsService.remove(id);
  }
}
