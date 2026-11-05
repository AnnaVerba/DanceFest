import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Competition } from '../competitions/competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { Nomination } from '../nominations/nomination.model';
import { Category } from '../categories/category.model';
import { User } from '../users/user.model';
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
import { TrackFileNameResolver } from '../tracks/track-file-name-resolver.service';
import { TrackRenamer } from '../tracks/track-renamer.service';
import { Track } from '../tracks/track.model';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Competition,
      CompetitionAdmin,
      Nomination,
      Category,
      User,
      Track,
      Entry,
      Score,
    ]),
    NominationsModule,
    UsersModule,
    SchoolsModule,
    CompetitionParticipantNumbersModule,
    ScheduleModule,
    UploadsModule,
  ],
  controllers: [EntriesController, MyEntriesController],
  providers: [
    EntriesService,
    EntryChargeCalculator,
    EntryChargeService,
    TrackFileNameResolver,
    TrackRenamer,
  ],
  exports: [EntriesService, EntryChargeService, TrackFileNameResolver],
})
export class EntriesModule {}
