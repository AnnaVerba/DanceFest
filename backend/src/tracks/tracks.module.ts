import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Entry } from '../entries/entry.model';
import { Competition } from '../competitions/competition.model';
import { Nomination } from '../nominations/nomination.model';
import { Category } from '../categories/category.model';
import { User } from '../users/user.model';
import { EntriesModule } from '../entries/entries.module';
import { CompetitionsModule } from '../competitions/competitions.module';
import { CompetitionRulesModule } from '../competition-rules/competition-rules.module';
import { UploadsModule } from '../uploads/uploads.module';
import { Track } from './track.model';
import { TracksController } from './tracks.controller';
import { MusicDeadlineController } from './music-deadline.controller';
import { TracksService } from './tracks.service';
import { TrackFileNameResolver } from './track-file-name-resolver.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Track,
      Entry,
      Competition,
      Nomination,
      Category,
      User,
    ]),
    EntriesModule,
    CompetitionsModule,
    CompetitionRulesModule,
    UploadsModule,
  ],
  controllers: [TracksController, MusicDeadlineController],
  providers: [TracksService, TrackFileNameResolver],
})
export class TracksModule {}
