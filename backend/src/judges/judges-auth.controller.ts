import {
  Body,
  Controller,
  Get,
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
import { JudgesAuthService } from './judges-auth.service';
import { JudgeAuthGuard } from './judge-auth.guard';
import { CurrentJudge } from './current-judge.decorator';
import type { AuthenticatedJudge } from './current-judge.decorator';
import { JudgeLoginDto } from './dto/judge-login.dto';
import { SubmitScoreDto } from './dto/submit-score.dto';

@ApiTags('judges')
@Controller('judges')
export class JudgesAuthController {
  constructor(private readonly judgesAuthService: JudgesAuthService) {}

  @ApiOperation({ summary: 'Log in as a judge' })
  @ApiResponse({
    status: 200,
    description:
      'Login successful; returns an access token scoped to the judge and their competition.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed for one or more fields.',
  })
  @ApiResponse({ status: 401, description: 'Invalid email or password.' })
  @Post('login')
  login(@Body() dto: JudgeLoginDto) {
    return this.judgesAuthService.login(dto);
  }

  @ApiOperation({ summary: 'Get the currently authenticated judge' })
  @ApiResponse({ status: 200, description: 'Judge profile returned.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiBearerAuth()
  @UseGuards(JudgeAuthGuard)
  @Get('me')
  me(@CurrentJudge() judge: AuthenticatedJudge) {
    return this.judgesAuthService.me(judge);
  }

  @ApiOperation({
    summary: "List the judge's competition performances",
    description:
      "Each performance includes this judge's own score, if already submitted.",
  })
  @ApiResponse({ status: 200, description: 'Performances returned.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiBearerAuth()
  @UseGuards(JudgeAuthGuard)
  @Get('me/performances')
  listPerformances(@CurrentJudge() judge: AuthenticatedJudge) {
    return this.judgesAuthService.listPerformances(judge);
  }

  @ApiOperation({
    summary: "Submit or update the judge's score for a performance",
  })
  @ApiResponse({ status: 200, description: 'Score saved.' })
  @ApiResponse({
    status: 400,
    description: 'Validation failed — score must be between 1 and 10.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 404,
    description: 'Performance not found in this judge’s competition.',
  })
  @ApiBearerAuth()
  @UseGuards(JudgeAuthGuard)
  @Patch('me/performances/:performanceId/score')
  submitScore(
    @CurrentJudge() judge: AuthenticatedJudge,
    @Param('performanceId') performanceId: string,
    @Body() dto: SubmitScoreDto,
  ) {
    return this.judgesAuthService.submitScore(judge, performanceId, dto);
  }
}
