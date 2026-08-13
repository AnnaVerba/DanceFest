import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Competition } from '../competitions/competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { Entry } from './entry.model';
import { EntriesController } from './entries.controller';
import { EntriesService } from './entries.service';

@Module({
  imports: [SequelizeModule.forFeature([Competition, CompetitionAdmin, Entry])],
  controllers: [EntriesController],
  providers: [EntriesService],
})
export class EntriesModule {}
