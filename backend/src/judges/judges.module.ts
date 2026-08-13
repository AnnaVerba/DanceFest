import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Competition } from '../competitions/competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { Judge } from './judge.model';
import { JudgesController } from './judges.controller';
import { JudgesService } from './judges.service';

@Module({
  imports: [SequelizeModule.forFeature([Competition, CompetitionAdmin, Judge])],
  controllers: [JudgesController],
  providers: [JudgesService],
})
export class JudgesModule {}
