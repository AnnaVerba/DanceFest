import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Entry } from '../entries/entry.model';
import { Track } from '../tracks/track.model';
import { CompetitionsModule } from '../competitions/competitions.module';
import { CompetitionRulesModule } from '../competition-rules/competition-rules.module';
import { OveragesController } from './overages.controller';
import { OveragesService } from './overages.service';

@Module({
  imports: [
    SequelizeModule.forFeature([Entry, Track]),
    CompetitionsModule,
    CompetitionRulesModule,
  ],
  controllers: [OveragesController],
  providers: [OveragesService],
})
export class OveragesModule {}
