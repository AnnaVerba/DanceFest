import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Competition } from '../competitions/competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { Entry } from '../entries/entry.model';
import { CompetitionRulesModule } from '../competition-rules/competition-rules.module';
import { UsersModule } from '../users/users.module';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { CompetitionDay } from './competition-day.model';
import { Section } from './section.model';
import { SectionItem } from './section-item.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Competition,
      CompetitionAdmin,
      Entry,
      CompetitionDay,
      Section,
      SectionItem,
    ]),
    CompetitionRulesModule,
    UsersModule,
  ],
  controllers: [ScheduleController],
  providers: [ScheduleService],
})
export class ScheduleModule {}
