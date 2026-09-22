import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Competition } from '../competitions/competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { Nomination } from '../nominations/nomination.model';
import { NominationsModule } from '../nominations/nominations.module';
import { UsersModule } from '../users/users.module';
import { SchoolsModule } from '../schools/schools.module';
import { CompetitionParticipantNumbersModule } from '../competition-participant-numbers/competition-participant-numbers.module';
import { ScheduleModule } from '../schedule/schedule.module';
import { Entry } from './entry.model';
import { Score } from './score.model';
import { EntriesController } from './entries.controller';
import { MyEntriesController } from './my-entries.controller';
import { EntriesService } from './entries.service';
import { EntryChargeCalculator } from './pricing/entry-charge-calculator';
import { EntryChargeService } from './pricing/entry-charge.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Competition,
      CompetitionAdmin,
      Nomination,
      Entry,
      Score,
    ]),
    NominationsModule,
    UsersModule,
    SchoolsModule,
    CompetitionParticipantNumbersModule,
    ScheduleModule,
  ],
  controllers: [EntriesController, MyEntriesController],
  providers: [EntriesService, EntryChargeCalculator, EntryChargeService],
  exports: [EntriesService, EntryChargeService],
})
export class EntriesModule {}
