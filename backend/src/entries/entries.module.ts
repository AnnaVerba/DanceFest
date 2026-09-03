import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Competition } from '../competitions/competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { Nomination } from '../nominations/nomination.model';
import { NominationsModule } from '../nominations/nominations.module';
import { UsersModule } from '../users/users.module';
import { SchoolsModule } from '../schools/schools.module';
import { Entry } from './entry.model';
import { Score } from './score.model';
import { EntriesController } from './entries.controller';
import { MyEntriesController } from './my-entries.controller';
import { EntriesService } from './entries.service';

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
  ],
  controllers: [EntriesController, MyEntriesController],
  providers: [EntriesService],
})
export class EntriesModule {}
