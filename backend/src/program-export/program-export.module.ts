import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Competition } from '../competitions/competition.model';
import { CompetitionDay } from '../schedule/competition-day.model';
import { ScheduleModule } from '../schedule/schedule.module';
import { Venue } from '../venues/venue.model';
import { ProgramExcelController } from './program-excel.controller';
import { ProgramExcelService } from './program-excel.service';

@Module({
  imports: [
    SequelizeModule.forFeature([Competition, CompetitionDay, Venue]),
    ScheduleModule,
  ],
  controllers: [ProgramExcelController],
  providers: [ProgramExcelService],
})
export class ProgramExportModule {}
