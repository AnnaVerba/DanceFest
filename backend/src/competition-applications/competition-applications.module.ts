import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Competition } from '../competitions/competition.model';
import { UsersModule } from '../users/users.module';
import { CategoriesModule } from '../categories/categories.module';
import { CompetitionParticipantNumbersModule } from '../competition-participant-numbers/competition-participant-numbers.module';
import { CompetitionApplication } from './competition-application.model';
import { CompetitionApplicationsController } from './competition-applications.controller';
import { CompetitionApplicationsService } from './competition-applications.service';

@Module({
  imports: [
    SequelizeModule.forFeature([Competition, CompetitionApplication]),
    UsersModule,
    CategoriesModule,
    CompetitionParticipantNumbersModule,
  ],
  controllers: [CompetitionApplicationsController],
  providers: [CompetitionApplicationsService],
})
export class CompetitionApplicationsModule {}
