import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JudgesAuthService } from './judges-auth.service';
import { JudgeLoginDto } from './dto/judge-login.dto';
import { SubmitScoreDto } from './dto/submit-score.dto';
import { JudgeAuthGuard } from './judge-auth.guard';
import { CurrentJudge } from './current-judge.decorator';
import type { AuthenticatedJudge } from './current-judge.decorator';

@ApiTags('judge-auth')
@Controller('judges')
export class JudgesAuthController {
  constructor(private readonly judgesAuthService: JudgesAuthService) {}

  @ApiOperation({ summary: 'Log in as a judge with email and temporary password' })
  @ApiResponse({
    status: 201,
    description: 'Login successful; returns an access token scoped to one competition.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed for one or more fields.' })
  @ApiResponse({ status: 401, description: 'Invalid email or password.' })
  @Post('login')
  login(@Body() dto: JudgeLoginDto) {
    return this.judgesAuthService.login(dto);
  }

  @ApiOperation({ summary: "List the logged-in judge's competition entries" })
  @ApiResponse({ status: 200, description: 'Entries returned with this judge\'s own score.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiBearerAuth()
  @UseGuards(JudgeAuthGuard)
  @Get('me/entries')
  listEntries(@CurrentJudge() judge: AuthenticatedJudge) {
    return this.judgesAuthService.listEntries(judge);
  }

  @ApiOperation({ summary: "Submit or update the judge's score for an entry (1–10)" })
  @ApiResponse({ status: 200, description: 'Score saved.' })
  @ApiResponse({
    status: 400,
    description: 'Validation failed — value must be between 1 and 10.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 404,
    description: 'Entry not found or does not belong to this judge\'s competition.',
  })
  @ApiBearerAuth()
  @UseGuards(JudgeAuthGuard)
  @Patch('me/entries/:entryId/score')
  submitScore(
    @CurrentJudge() judge: AuthenticatedJudge,
    @Param('entryId') entryId: string,
    @Body() dto: SubmitScoreDto,
  ) {
    return this.judgesAuthService.submitScore(judge, entryId, dto);
  }
}
