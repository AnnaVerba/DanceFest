import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Competition } from '../competitions/competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { Category } from '../categories/category.model';
import { Venue } from '../venues/venue.model';
import { CompetitionRulesModule } from '../competition-rules/competition-rules.module';
import { Nomination } from './nomination.model';
import { NominationsController } from './nominations.controller';
import { NominationsService } from './nominations.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Competition,
      CompetitionAdmin,
      Nomination,
      Category,
      Venue,
    ]),
    CompetitionRulesModule,
  ],
  controllers: [NominationsController],
  providers: [NominationsService],
  exports: [NominationsService],
})
export class NominationsModule {}
