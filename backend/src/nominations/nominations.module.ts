import { Entry } from '../entries/entry.model';
import { ScheduleModule } from '../schedule/schedule.module';
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Competition } from '../competitions/competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { Category } from '../categories/category.model';
import { Venue } from '../venues/venue.model';
import { CompetitionRulesModule } from '../competition-rules/competition-rules.module';
import { Nomination } from './nomination.model';
import { NominationCategory } from './nomination-category.model';
import { NominationsController } from './nominations.controller';
import { NominationsService } from './nominations.service';
import { SpecialNominationGroups } from './special-nomination-groups';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Competition,
      CompetitionAdmin,
      Nomination,
      NominationCategory,
      Category,
      Venue,
      Entry,
    ]),
    CompetitionRulesModule,
    ScheduleModule,
  ],
  controllers: [NominationsController],
  providers: [NominationsService, SpecialNominationGroups],
  exports: [NominationsService],
})
export class NominationsModule {}
