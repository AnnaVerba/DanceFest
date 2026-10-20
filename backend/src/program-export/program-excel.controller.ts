import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import {
  CONTENT_DISPOSITION_PREFIX,
  XLSX_MIME_TYPE,
} from './program-excel.constants';
import { ProgramExcelService } from './program-excel.service';

@ApiTags('schedule')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('competitions/:competitionId/program/excel')
export class ProgramExcelController {
  constructor(private readonly programExcelService: ProgramExcelService) {}

  @ApiOperation({
    summary: 'The live program as .xlsx, one sheet per venue and section',
    description:
      'Streamed: the program is read a few sections at a time and written ' +
      'straight into the response.',
  })
  @ApiResponse({ status: 200, description: 'The .xlsx file.' })
  @ApiResponse({ status: 403, description: 'Not on the competition team.' })
  @ApiResponse({ status: 404, description: 'No such competition.' })
  @Get()
  async download(
    @Param('competitionId') competitionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    const job = await this.programExcelService.prepare(competitionId, user);
    res.setHeader('Content-Type', XLSX_MIME_TYPE);
    res.setHeader(
      'Content-Disposition',
      `${CONTENT_DISPOSITION_PREFIX}${encodeURIComponent(job.fileName)}`,
    );
    try {
      await this.programExcelService.streamTo(job, res);
    } catch (err) {
      // Headers are out — the only honest signal left is a cut connection.
      res.destroy(err instanceof Error ? err : undefined);
    }
  }
}
