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
import { JudgesService } from './judges.service';
import { CreateJudgeDto } from './dto/create-judge.dto';

@ApiTags('judges')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('competitions/:competitionId/judges')
export class JudgesController {
  constructor(private readonly judgesService: JudgesService) {}

  @ApiOperation({ summary: "List a competition's judges" })
  @ApiResponse({ status: 200, description: 'Judges returned.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'The caller has no access to this competition.',
  })
  @ApiResponse({
    status: 404,
    description: 'No competition exists with the given id.',
  })
  @Get()
  list(
    @Param('competitionId') competitionId: string,
    @CurrentUser() admin: AuthenticatedAdmin,
  ) {
    return this.judgesService.list(competitionId, admin.id);
  }

  @ApiOperation({ summary: 'Add a judge to a competition' })
  @ApiResponse({
    status: 201,
    description:
      'Judge created; the response includes a one-time plaintext temporary password (only stored hashed afterwards).',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed for one or more fields.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'The caller has no access to this competition.',
  })
  @ApiResponse({
    status: 404,
    description: 'No competition exists with the given id.',
  })
  @Post()
  create(
    @Param('competitionId') competitionId: string,
    @CurrentUser() admin: AuthenticatedAdmin,
    @Body() dto: CreateJudgeDto,
  ) {
    return this.judgesService.create(competitionId, admin.id, dto);
  }

  @ApiOperation({ summary: 'Remove a judge from a competition' })
  @ApiResponse({ status: 204, description: 'Judge removed.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'The caller has no access to this competition.',
  })
  @ApiResponse({ status: 404, description: 'Competition or judge not found.' })
  @Delete(':judgeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('competitionId') competitionId: string,
    @Param('judgeId') judgeId: string,
    @CurrentUser() admin: AuthenticatedAdmin,
  ) {
    return this.judgesService.remove(competitionId, judgeId, admin.id);
  }
}
