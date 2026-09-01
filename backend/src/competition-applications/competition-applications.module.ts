import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Competition } from '../competitions/competition.model';
import { ParticipantsModule } from '../participants/participants.module';
import { LeaguesModule } from '../leagues/leagues.module';
import { CompetitionApplication } from './competition-application.model';
import { CompetitionApplicationsController } from './competition-applications.controller';
import { CompetitionApplicationsService } from './competition-applications.service';

@Module({
  imports: [
    SequelizeModule.forFeature([Competition, CompetitionApplication]),
    ParticipantsModule,
    LeaguesModule,
  ],
  controllers: [CompetitionApplicationsController],
  providers: [CompetitionApplicationsService],
})
export class CompetitionApplicationsModule {}
