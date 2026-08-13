import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CompetitionsController } from './competitions.controller';
import { CompetitionsService } from './competitions.service';
import { Competition } from './competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';

@Module({
  imports: [SequelizeModule.forFeature([Competition, CompetitionAdmin])],
  controllers: [CompetitionsController],
  providers: [CompetitionsService],
})
export class CompetitionsModule {}
