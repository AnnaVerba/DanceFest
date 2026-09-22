import {
  Controller,
  Get,
  Param,
  ParseEnumPipe,
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
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedAdmin } from '../auth/current-user.decorator';
import { FinanceService } from './finance.service';
import { FinanceGroup } from './finance-group.enum';

@ApiTags('finance')
@Controller('competitions/:competitionId/finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @ApiOperation({
    summary: "A competition's finance total",
    description:
      'Organizer report: the sum of every entry amount and the entry ' +
      'count. An entry costs its per-person nomination price times its ' +
      'dancers plus any recorded extra-time fee.',
  })
  @ApiResponse({ status: 200, description: 'Finance summary returned.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'The caller has no access to this competition.',
  })
  @ApiResponse({
    status: 404,
    description: 'No competition exists with the given id.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  summary(
    @Param('competitionId') competitionId: string,
    @CurrentUser() admin: AuthenticatedAdmin,
  ) {
    return this.financeService.summary(
      competitionId,
      admin.id,
      admin.accessLevel,
    );
  }

  @ApiOperation({
    summary: 'What each dancer, trainer or studio owes',
    description:
      'One page of per-group sums, in the order of their earliest entry ' +
      '(createdAt), optionally narrowed by a case-insensitive name ' +
      'search. Page is zero-based.',
  })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiResponse({ status: 200, description: 'Finance rows returned.' })
  @ApiResponse({ status: 400, description: 'Unknown finance group.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'The caller has no access to this competition.',
  })
  @ApiResponse({
    status: 404,
    description: 'No competition exists with the given id.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':group')
  listGroup(
    @Param('competitionId') competitionId: string,
    @Param('group', new ParseEnumPipe(FinanceGroup)) group: FinanceGroup,
    @CurrentUser() admin: AuthenticatedAdmin,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.financeService.listGroup(
      competitionId,
      group,
      admin.id,
      admin.accessLevel,
      search,
      page,
      pageSize,
    );
  }
}
