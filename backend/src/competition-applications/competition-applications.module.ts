import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Competition } from '../competitions/competition.model';
import { UsersModule } from '../users/users.module';
import { CategoriesModule } from '../categories/categories.module';
import { CompetitionApplication } from './competition-application.model';
import { CompetitionApplicationsController } from './competition-applications.controller';
import { CompetitionApplicationsService } from './competition-applications.service';

@Module({
  imports: [
    SequelizeModule.forFeature([Competition, CompetitionApplication]),
    UsersModule,
    CategoriesModule,
  ],
  controllers: [CompetitionApplicationsController],
  providers: [CompetitionApplicationsService],
})
export class CompetitionApplicationsModule {}
