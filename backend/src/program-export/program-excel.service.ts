import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { stream } from 'exceljs';
import type { Writable } from 'stream';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { Competition } from '../competitions/competition.model';
import { COMPETITION_NOT_FOUND_MESSAGE } from '../competitions/competitions.constants';
import { CompetitionDay } from '../schedule/competition-day.model';
import { buildExtendedProgram, sectionEndTime } from '../schedule/program-view';
import { ScheduleService } from '../schedule/schedule.service';
import { Venue } from '../venues/venue.model';
import {
  EMPTY_PROGRAM_SHEET_NAME,
  PROGRAM_EXCEL_SECTIONS_PER_CHUNK,
  PROGRAM_FILE_EXTENSION,
  PROGRAM_FILE_NAME_PREFIX,
  PROGRAM_FILE_NAME_SEPARATOR,
} from './program-excel.constants';
import type { ProgramExcelJob } from './program-excel-job.interface';
import { ProgramSheetBuilder } from './program-sheet-builder';
import { ProgramSheetWriter } from './program-sheet-writer';

@Injectable()
export class ProgramExcelService {
  constructor(
    private readonly scheduleService: ScheduleService,
    @InjectModel(Competition)
    private readonly competitionModel: typeof Competition,
    @InjectModel(CompetitionDay)
    private readonly dayModel: typeof CompetitionDay,
    @InjectModel(Venue) private readonly venueModel: typeof Venue,
  ) {}

  // Access, the running order of section ids and the day / venue names —
  // all small, all before a single byte of the file is sent.
  async prepare(
    competitionId: string,
    requester: AuthenticatedUser,
  ): Promise<ProgramExcelJob> {
    const competition = await this.competitionModel.findByPk(competitionId, {
      attributes: ['id', 'name'],
    });
    if (!competition) {
      throw new NotFoundException(COMPETITION_NOT_FOUND_MESSAGE);
    }
    const sectionIds = await this.scheduleService.programSectionIds(
      competitionId,
      requester,
    );
    const [days, venues] = await Promise.all([
      this.dayModel.findAll({ where: { competitionId } }),
      this.venueModel.findAll({ where: { competitionId } }),
    ]);
    return {
      fileName: `${PROGRAM_FILE_NAME_PREFIX}${PROGRAM_FILE_NAME_SEPARATOR}${competition.name}${PROGRAM_FILE_EXTENSION}`,
      sectionIds,
      places: {
        dayLabels:
          days.length > 1
            ? new Map(days.map((day) => [day.id, day.label ?? day.date]))
            : null,
        venueNames:
          venues.length > 0
            ? new Map(venues.map((venue) => [venue.id, venue.name]))
            : null,
      },
    };
  }

  // Streams the .xlsx into `output`, reading the program a few sections at
  // a time and flushing each sheet as soon as it is written.
  async streamTo(job: ProgramExcelJob, output: Writable): Promise<void> {
    const workbook = new stream.xlsx.WorkbookWriter({
      stream: output,
      useStyles: true,
      useSharedStrings: false,
    });
    const builder = new ProgramSheetBuilder(job.places);
    const writer = new ProgramSheetWriter(workbook);
    for (
      let start = 0;
      start < job.sectionIds.length;
      start += PROGRAM_EXCEL_SECTIONS_PER_CHUNK
    ) {
      const views = await this.scheduleService.sectionViewsByIds(
        job.sectionIds.slice(start, start + PROGRAM_EXCEL_SECTIONS_PER_CHUNK),
      );
      buildExtendedProgram(views).forEach((section, index) =>
        writer.write(builder.build(section, sectionEndTime(views[index]))),
      );
    }
    // Excel refuses a workbook without sheets — an unplanned program still
    // downloads as one empty sheet.
    if (job.sectionIds.length === 0) {
      workbook.addWorksheet(EMPTY_PROGRAM_SHEET_NAME).commit();
    }
    await workbook.commit();
  }
}
