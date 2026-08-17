import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Competition } from '../competitions/competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { Nomination } from './nomination.model';
import { NominationsController } from './nominations.controller';
import { NominationsService } from './nominations.service';

@Module({
  imports: [
    SequelizeModule.forFeature([Competition, CompetitionAdmin, Nomination]),
  ],
  controllers: [NominationsController],
  providers: [NominationsService],
})
export class NominationsModule {}
